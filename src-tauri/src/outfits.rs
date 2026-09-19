use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Outfit {
    pub id: String,
    pub name: String,
    pub item_ids: Vec<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutfitInput {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub item_ids: Vec<String>,
    pub notes: Option<String>,
}

pub fn create(connection: &mut Connection, input: OutfitInput) -> Result<Outfit, String> {
    validate(&input)?;
    let transaction = connection.transaction().map_err(db_error)?;
    transaction.execute(
        "INSERT INTO outfits (id, name, notes, created_at, updated_at) VALUES (?1, ?2, ?3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
        params![input.id, input.name.trim(), clean(&input.notes)],
    ).map_err(db_error)?;
    replace_items(&transaction, &input.id, &input.item_ids)?;
    transaction.commit().map_err(db_error)?;
    get(connection, &input.id)?.ok_or_else(|| "The outfit could not be read after saving.".into())
}

pub fn get(connection: &Connection, id: &str) -> Result<Option<Outfit>, String> {
    let base: Option<Outfit> = connection
        .query_row(
            "SELECT id, name, notes, created_at, updated_at FROM outfits WHERE id = ?1",
            [id],
            |row| {
                Ok(Outfit {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    item_ids: Vec::new(),
                    notes: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            },
        )
        .optional()
        .map_err(db_error)?;
    base.map(|mut outfit| {
        outfit.item_ids = item_ids(connection, &outfit.id)?;
        Ok(outfit)
    })
    .transpose()
}

pub fn list(connection: &Connection) -> Result<Vec<Outfit>, String> {
    let mut statement = connection
        .prepare("SELECT id FROM outfits ORDER BY updated_at DESC, id ASC")
        .map_err(db_error)?;
    let ids = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)?;
    ids.iter()
        .map(|id| get(connection, id)?.ok_or_else(|| "An outfit disappeared while loading.".into()))
        .collect()
}

pub fn update(connection: &mut Connection, id: &str, input: OutfitInput) -> Result<Outfit, String> {
    validate(&input)?;
    if input.id != id {
        return Err("The outfit ID cannot be changed.".into());
    }
    let transaction = connection.transaction().map_err(db_error)?;
    let changed = transaction.execute(
        "UPDATE outfits SET name = ?2, notes = ?3, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1",
        params![id, input.name.trim(), clean(&input.notes)],
    ).map_err(db_error)?;
    if changed == 0 {
        return Err("Outfit not found.".into());
    }
    replace_items(&transaction, id, &input.item_ids)?;
    transaction.commit().map_err(db_error)?;
    get(connection, id)?.ok_or_else(|| "The outfit could not be read after updating.".into())
}

pub fn delete(connection: &Connection, id: &str) -> Result<bool, String> {
    Ok(connection
        .execute("DELETE FROM outfits WHERE id = ?1", [id])
        .map_err(db_error)?
        > 0)
}

pub fn containing_item(
    connection: &Connection,
    clothing_item_id: &str,
) -> Result<Vec<Outfit>, String> {
    let mut statement = connection
        .prepare(
            "SELECT outfit_id FROM outfit_items WHERE clothing_item_id = ?1 ORDER BY outfit_id",
        )
        .map_err(db_error)?;
    let ids = statement
        .query_map([clothing_item_id], |row| row.get::<_, String>(0))
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)?;
    ids.iter()
        .map(|id| get(connection, id)?.ok_or_else(|| "An outfit disappeared while loading.".into()))
        .collect()
}

fn replace_items(
    transaction: &Transaction<'_>,
    outfit_id: &str,
    ids: &[String],
) -> Result<(), String> {
    transaction
        .execute("DELETE FROM outfit_items WHERE outfit_id = ?1", [outfit_id])
        .map_err(db_error)?;
    for (position, item_id) in ids
        .iter()
        .map(|id| id.trim())
        .filter(|id| !id.is_empty())
        .enumerate()
    {
        transaction.execute("INSERT OR IGNORE INTO outfit_items (outfit_id, clothing_item_id, position) VALUES (?1, ?2, ?3)", params![outfit_id, item_id, position as i64]).map_err(db_error)?;
    }
    Ok(())
}

fn item_ids(connection: &Connection, outfit_id: &str) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare("SELECT clothing_item_id FROM outfit_items WHERE outfit_id = ?1 ORDER BY position")
        .map_err(db_error)?;
    let result = statement
        .query_map([outfit_id], |row| row.get(0))
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error);
    result
}

fn validate(input: &OutfitInput) -> Result<(), String> {
    if input.id.trim().is_empty() {
        return Err("A stable outfit ID is required.".into());
    }
    if input.name.trim().is_empty() {
        return Err("Enter a name for the outfit.".into());
    }
    Ok(())
}

fn clean(value: &Option<String>) -> Option<&str> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
}
fn db_error(error: rusqlite::Error) -> String {
    format!("Local database error: {error}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::{self, ClothingItemInput};

    fn clothing(id: &str) -> ClothingItemInput {
        ClothingItemInput {
            id: id.into(),
            name: format!("Item {id}"),
            category: "top".into(),
            subtype: None,
            colors: vec![],
            material: None,
            pattern: None,
            seasons: vec![],
            occasions: vec![],
            style_tags: vec![],
            ownership: "owned".into(),
            image_path: format!("images/{id}.jpg"),
            notes: None,
        }
    }
    fn outfit() -> OutfitInput {
        OutfitInput {
            id: "outfit-1".into(),
            name: "Weekend look".into(),
            item_ids: vec!["item-1".into(), "item-2".into()],
            notes: Some("Comfortable".into()),
        }
    }
    fn database() -> Connection {
        let mut connection = Connection::open_in_memory().unwrap();
        database::migrate(&mut connection).unwrap();
        connection
    }

    #[test]
    fn outfit_crud_and_relationship_query_work() {
        let mut connection = database();
        database::create(&mut connection, clothing("item-1")).unwrap();
        database::create(&mut connection, clothing("item-2")).unwrap();
        let created = create(&mut connection, outfit()).unwrap();
        assert_eq!(created.item_ids, vec!["item-1", "item-2"]);
        assert_eq!(list(&connection).unwrap().len(), 1);
        assert_eq!(
            containing_item(&connection, "item-2").unwrap()[0].id,
            "outfit-1"
        );
        let mut changed = outfit();
        changed.name = "Updated look".into();
        changed.item_ids = vec!["item-2".into()];
        let updated = update(&mut connection, "outfit-1", changed).unwrap();
        assert_eq!(updated.name, "Updated look");
        assert_eq!(updated.item_ids, vec!["item-2"]);
        assert!(delete(&connection, "outfit-1").unwrap());
        assert!(get(&connection, "outfit-1").unwrap().is_none());
    }

    #[test]
    fn deleting_clothing_preserves_outfit_and_removes_only_its_reference() {
        let mut connection = database();
        database::create(&mut connection, clothing("item-1")).unwrap();
        database::create(&mut connection, clothing("item-2")).unwrap();
        create(&mut connection, outfit()).unwrap();
        database::delete(&connection, "item-1").unwrap();
        let preserved = get(&connection, "outfit-1").unwrap().unwrap();
        assert_eq!(preserved.item_ids, vec!["item-2"]);
    }

    #[test]
    fn outfit_survives_database_reopen() {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "wordrop-outfits-{}-{unique}.db",
            std::process::id()
        ));
        {
            let mut connection = database::open_database(&path).unwrap();
            database::create(&mut connection, clothing("item-1")).unwrap();
            let mut input = outfit();
            input.item_ids = vec!["item-1".into()];
            create(&mut connection, input).unwrap();
        }
        {
            let connection = database::open_database(&path).unwrap();
            assert_eq!(
                get(&connection, "outfit-1").unwrap().unwrap().item_ids,
                vec!["item-1"]
            );
        }
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
    }
}
