use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WearEvent {
    pub id: String,
    pub worn_on: String,
    pub outfit_id: Option<String>,
    pub source_name: String,
    pub is_outfit: bool,
    pub item_ids: Vec<String>,
    pub created_at: String,
}

fn db_error(error: rusqlite::Error) -> String {
    format!("Wear history could not be updated: {error}")
}

fn validate_date(date: &str, today: &str) -> Result<(), String> {
    let valid = (|| {
        if date.len() != 10 || date.as_bytes()[4] != b'-' || date.as_bytes()[7] != b'-' {
            return None;
        }
        if !date
            .bytes()
            .enumerate()
            .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
        {
            return None;
        }
        if !date
            .bytes()
            .enumerate()
            .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
        {
            return None;
        }
        let year: u32 = date.get(..4)?.parse().ok()?;
        let month: u32 = date.get(5..7)?.parse().ok()?;
        let day: u32 = date.get(8..)?.parse().ok()?;
        let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
        let days = match month {
            1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
            4 | 6 | 9 | 11 => 30,
            2 => {
                if leap {
                    29
                } else {
                    28
                }
            }
            _ => 0,
        };
        Some(year > 0 && day > 0 && day <= days && date <= today)
    })()
    .unwrap_or(false);
    if valid {
        Ok(())
    } else {
        Err("Choose a valid wear date today or earlier.".into())
    }
}

pub fn record(
    connection: &mut Connection,
    id: &str,
    target_id: &str,
    is_outfit: bool,
    worn_on: &str,
) -> Result<(), String> {
    let today: String = connection
        .query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))
        .map_err(db_error)?;
    validate_date(worn_on, &today)?;
    if id.trim().is_empty() {
        return Err("A wear history ID is required.".into());
    }
    let transaction = connection.transaction().map_err(db_error)?;
    let (name, ids) = if is_outfit {
        let outfit = crate::outfits::get(&transaction, target_id)?.ok_or("Outfit not found.")?;
        if outfit.item_ids.is_empty() {
            return Err("Add clothing to this outfit before recording a wear.".into());
        }
        (outfit.name, outfit.item_ids)
    } else {
        let item =
            crate::database::get(&transaction, target_id)?.ok_or("Clothing item not found.")?;
        (item.name, vec![item.id])
    };
    if !is_outfit {
        let existing: Option<String> = transaction.query_row(
            "SELECT e.id FROM wear_events e JOIN wear_event_items i ON i.event_id=e.id WHERE i.clothing_item_id=?1 AND e.worn_on=?2 AND e.is_outfit=0",
            params![target_id, worn_on], |row| row.get(0)).optional().map_err(db_error)?;
        if existing.is_some() {
            return Err("This piece already has an individual wear recorded on that date.".into());
        }
    }
    transaction.execute("INSERT INTO wear_events (id, worn_on, outfit_id, source_name, is_outfit, created_at) VALUES (?1, ?2, ?3, ?4, ?5, strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
        params![id, worn_on, if is_outfit {Some(target_id)} else {None}, name, is_outfit]).map_err(|_| "This wear could not be saved. It may already be recorded on that date.".to_string())?;
    for item_id in ids {
        transaction
            .execute(
                "INSERT INTO wear_event_items(event_id, clothing_item_id) VALUES (?1, ?2)",
                params![id, item_id],
            )
            .map_err(db_error)?;
    }
    transaction.commit().map_err(db_error)
}

pub fn list(connection: &Connection) -> Result<Vec<WearEvent>, String> {
    let mut statement = connection.prepare("SELECT id, worn_on, outfit_id, source_name, is_outfit, created_at FROM wear_events ORDER BY worn_on DESC, created_at DESC, id").map_err(db_error)?;
    let mut events = statement
        .query_map([], |row| {
            Ok(WearEvent {
                id: row.get(0)?,
                worn_on: row.get(1)?,
                outfit_id: row.get(2)?,
                source_name: row.get(3)?,
                is_outfit: row.get(4)?,
                created_at: row.get(5)?,
                item_ids: vec![],
            })
        })
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)?;
    for event in &mut events {
        let mut items = connection.prepare("SELECT clothing_item_id FROM wear_event_items WHERE event_id=?1 ORDER BY clothing_item_id").map_err(db_error)?;
        event.item_ids = items
            .query_map([&event.id], |row| row.get(0))
            .map_err(db_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_error)?;
    }
    Ok(events)
}

pub fn delete(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM wear_events WHERE id=?1", [id])
        .map_err(db_error)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn database() -> Connection {
        let mut db = Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        crate::database::migrate(&mut db).unwrap();
        for id in ["a", "b", "c"] {
            db.execute("INSERT INTO clothing_items(id,name,category,ownership,image_path,created_at,updated_at) VALUES (?1,?1,'top','owned','photo.jpg','','')", [id]).unwrap();
        }
        db.execute_batch("INSERT INTO outfits(id,name,created_at,updated_at) VALUES ('o','Weekend','',''); INSERT INTO outfit_items(outfit_id,clothing_item_id,position) VALUES ('o','a',0),('o','b',1);").unwrap();
        db
    }
    #[test]
    fn propagation_snapshot_duplicates_and_removal() {
        let mut db = database();
        record(&mut db, "one", "o", true, "2020-02-29").unwrap();
        assert_eq!(list(&db).unwrap()[0].item_ids, vec!["a", "b"]);
        assert!(record(&mut db, "duplicate", "o", true, "2020-02-29").is_err());
        record(&mut db, "direct", "a", false, "2020-02-29").unwrap();
        assert!(record(&mut db, "duplicate-direct", "a", false, "2020-02-29").is_err());
        db.execute_batch("DELETE FROM outfit_items; INSERT INTO outfit_items VALUES ('o','c',0);")
            .unwrap();
        assert_eq!(
            list(&db)
                .unwrap()
                .iter()
                .find(|e| e.id == "one")
                .unwrap()
                .item_ids,
            vec!["a", "b"]
        );
        delete(&db, "one").unwrap();
        assert_eq!(list(&db).unwrap().len(), 1);
        assert_eq!(list(&db).unwrap()[0].id, "direct");
        assert_eq!(list(&db).unwrap()[0].item_ids, vec!["a"]);
    }
    #[test]
    fn deletion_preserves_other_piece_history() {
        let mut db = database();
        record(&mut db, "one", "o", true, "2020-01-01").unwrap();
        crate::outfits::delete(&db, "o").unwrap();
        let history = list(&db).unwrap();
        assert!(history[0].outfit_id.is_none());
        assert!(history[0].is_outfit);
        assert_eq!(history[0].source_name, "Weekend");
        crate::database::delete(&db, "a").unwrap();
        assert_eq!(list(&db).unwrap()[0].item_ids, vec!["b"]);
    }
    #[test]
    fn invalid_dates_missing_targets_and_empty_outfits_leave_no_events() {
        let mut db = database();
        for date in [
            "2023-02-29",
            "2020-13-01",
            "2020-00-01",
            "2020-01-00",
            "2020-04-31",
            "2099-01-01",
            "20-01-01",
            "abcd-01-01",
        ] {
            assert!(record(&mut db, "bad", "o", true, date).is_err());
        }
        assert!(record(&mut db, "bad", "missing", false, "2020-01-01").is_err());
        db.execute("DELETE FROM outfit_items", []).unwrap();
        assert!(record(&mut db, "empty", "o", true, "2020-01-01").is_err());
        assert!(list(&db).unwrap().is_empty());
        crate::database::migrate(&mut db).unwrap();
        assert_eq!(
            db.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            crate::database::CURRENT_SCHEMA_VERSION
        );
    }
}
