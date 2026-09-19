use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

const INITIAL_MIGRATION: &str = include_str!("../migrations/0001_clothing_items.sql");
const OUTFITS_MIGRATION: &str = include_str!("../migrations/0002_outfits.sql");

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ClothingItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub subtype: Option<String>,
    pub colors: Vec<String>,
    pub material: Option<String>,
    pub pattern: Option<String>,
    pub seasons: Vec<String>,
    pub occasions: Vec<String>,
    pub style_tags: Vec<String>,
    pub ownership: String,
    pub image_path: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClothingItemInput {
    pub id: String,
    pub name: String,
    pub category: String,
    pub subtype: Option<String>,
    #[serde(default)]
    pub colors: Vec<String>,
    pub material: Option<String>,
    pub pattern: Option<String>,
    #[serde(default)]
    pub seasons: Vec<String>,
    #[serde(default)]
    pub occasions: Vec<String>,
    #[serde(default)]
    pub style_tags: Vec<String>,
    pub ownership: String,
    pub image_path: String,
    pub notes: Option<String>,
}

pub fn open_database(path: &Path) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create app data directory: {error}"))?;
    }
    let mut connection = Connection::open(path).map_err(db_error)?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")
        .map_err(db_error)?;
    migrate(&mut connection)?;
    Ok(connection)
}

pub(crate) fn migrate(connection: &mut Connection) -> Result<(), String> {
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(db_error)?;
    if version < 1 {
        let transaction = connection.transaction().map_err(db_error)?;
        transaction
            .execute_batch(INITIAL_MIGRATION)
            .map_err(db_error)?;
        transaction
            .pragma_update(None, "user_version", 1)
            .map_err(db_error)?;
        transaction.commit().map_err(db_error)?;
    }
    if version < 2 {
        let transaction = connection.transaction().map_err(db_error)?;
        transaction
            .execute_batch(OUTFITS_MIGRATION)
            .map_err(db_error)?;
        transaction
            .pragma_update(None, "user_version", 2)
            .map_err(db_error)?;
        transaction.commit().map_err(db_error)?;
    }
    Ok(())
}

pub fn create(
    connection: &mut Connection,
    input: ClothingItemInput,
) -> Result<ClothingItem, String> {
    validate(&input)?;
    let transaction = connection.transaction().map_err(db_error)?;
    transaction.execute(
        "INSERT INTO clothing_items (id, name, category, subtype, material, pattern, ownership, image_path, notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
        params![input.id, input.name.trim(), input.category, clean(&input.subtype), clean(&input.material), clean(&input.pattern), input.ownership, input.image_path.trim(), clean(&input.notes)],
    ).map_err(db_error)?;
    replace_values(
        &transaction,
        "clothing_item_colors",
        &input.id,
        &input.colors,
    )?;
    replace_values(
        &transaction,
        "clothing_item_seasons",
        &input.id,
        &input.seasons,
    )?;
    replace_values(
        &transaction,
        "clothing_item_occasions",
        &input.id,
        &input.occasions,
    )?;
    replace_values(
        &transaction,
        "clothing_item_style_tags",
        &input.id,
        &input.style_tags,
    )?;
    transaction.commit().map_err(db_error)?;
    get(connection, &input.id)?
        .ok_or_else(|| "The clothing item could not be read after saving.".into())
}

pub fn get(connection: &Connection, id: &str) -> Result<Option<ClothingItem>, String> {
    let base: Option<ClothingItem> = connection.query_row(
        "SELECT id, name, category, subtype, material, pattern, ownership, image_path, notes, created_at, updated_at FROM clothing_items WHERE id = ?1",
        [id],
        |row| Ok(ClothingItem { id: row.get(0)?, name: row.get(1)?, category: row.get(2)?, subtype: row.get(3)?, colors: Vec::new(), material: row.get(4)?, pattern: row.get(5)?, seasons: Vec::new(), occasions: Vec::new(), style_tags: Vec::new(), ownership: row.get(6)?, image_path: row.get(7)?, notes: row.get(8)?, created_at: row.get(9)?, updated_at: row.get(10)? }),
    ).optional().map_err(db_error)?;
    base.map(|mut item| {
        item.colors = values(connection, "clothing_item_colors", &item.id)?;
        item.seasons = values(connection, "clothing_item_seasons", &item.id)?;
        item.occasions = values(connection, "clothing_item_occasions", &item.id)?;
        item.style_tags = values(connection, "clothing_item_style_tags", &item.id)?;
        Ok(item)
    })
    .transpose()
}

pub fn list(connection: &Connection) -> Result<Vec<ClothingItem>, String> {
    let mut statement = connection
        .prepare("SELECT id FROM clothing_items ORDER BY created_at DESC, id ASC")
        .map_err(db_error)?;
    let ids = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)?;
    ids.iter()
        .map(|id| {
            get(connection, id)?.ok_or_else(|| "A clothing item disappeared while loading.".into())
        })
        .collect()
}

pub fn update(
    connection: &mut Connection,
    id: &str,
    input: ClothingItemInput,
) -> Result<ClothingItem, String> {
    validate(&input)?;
    if input.id != id {
        return Err("The clothing item ID cannot be changed.".into());
    }
    let transaction = connection.transaction().map_err(db_error)?;
    let changed = transaction.execute(
        "UPDATE clothing_items SET name=?2, category=?3, subtype=?4, material=?5, pattern=?6, ownership=?7, image_path=?8, notes=?9, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id=?1",
        params![id, input.name.trim(), input.category, clean(&input.subtype), clean(&input.material), clean(&input.pattern), input.ownership, input.image_path.trim(), clean(&input.notes)],
    ).map_err(db_error)?;
    if changed == 0 {
        return Err("Clothing item not found.".into());
    }
    replace_values(&transaction, "clothing_item_colors", id, &input.colors)?;
    replace_values(&transaction, "clothing_item_seasons", id, &input.seasons)?;
    replace_values(
        &transaction,
        "clothing_item_occasions",
        id,
        &input.occasions,
    )?;
    replace_values(
        &transaction,
        "clothing_item_style_tags",
        id,
        &input.style_tags,
    )?;
    transaction.commit().map_err(db_error)?;
    get(connection, id)?.ok_or_else(|| "The clothing item could not be read after updating.".into())
}

pub fn delete(connection: &Connection, id: &str) -> Result<bool, String> {
    Ok(connection
        .execute("DELETE FROM clothing_items WHERE id = ?1", [id])
        .map_err(db_error)?
        > 0)
}

pub fn image_reference_count(connection: &Connection, reference: &str) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT COUNT(*) FROM clothing_items WHERE image_path = ?1",
            [reference],
            |row| row.get(0),
        )
        .map_err(db_error)
}

fn replace_values(
    transaction: &Transaction<'_>,
    table: &str,
    item_id: &str,
    values: &[String],
) -> Result<(), String> {
    transaction
        .execute(
            &format!("DELETE FROM {table} WHERE clothing_item_id = ?1"),
            [item_id],
        )
        .map_err(db_error)?;
    let sql = format!(
        "INSERT OR IGNORE INTO {table} (clothing_item_id, value, position) VALUES (?1, ?2, ?3)"
    );
    for (position, value) in values
        .iter()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .enumerate()
    {
        transaction
            .execute(&sql, params![item_id, value, position as i64])
            .map_err(db_error)?;
    }
    Ok(())
}

fn values(connection: &Connection, table: &str, item_id: &str) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(&format!(
            "SELECT value FROM {table} WHERE clothing_item_id = ?1 ORDER BY position"
        ))
        .map_err(db_error)?;
    let result = statement
        .query_map([item_id], |row| row.get(0))
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error);
    result
}

fn validate(input: &ClothingItemInput) -> Result<(), String> {
    if input.id.trim().is_empty() {
        return Err("A stable clothing item ID is required.".into());
    }
    if input.name.trim().is_empty() {
        return Err("Enter a name for the clothing item.".into());
    }
    if !["top", "bottom", "dress", "shoes", "outerwear", "accessory"]
        .contains(&input.category.as_str())
    {
        return Err("Choose a valid clothing category.".into());
    }
    if !["owned", "wishlist"].contains(&input.ownership.as_str()) {
        return Err("Choose owned or wishlist.".into());
    }
    if input.image_path.trim().is_empty() {
        return Err("Choose an image for the clothing item.".into());
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

    fn sample() -> ClothingItemInput {
        ClothingItemInput {
            id: "item-1".into(),
            name: "Blue jeans".into(),
            category: "bottom".into(),
            subtype: Some("Jeans".into()),
            colors: vec!["blue".into(), "navy".into()],
            material: Some("Denim".into()),
            pattern: None,
            seasons: vec!["autumn".into(), "winter".into()],
            occasions: vec!["casual".into()],
            style_tags: vec!["classic".into()],
            ownership: "owned".into(),
            image_path: "images/item-1.jpg".into(),
            notes: None,
        }
    }

    #[test]
    fn clothing_crud_and_multi_values_work() {
        let mut db = Connection::open_in_memory().unwrap();
        migrate(&mut db).unwrap();
        let created = create(&mut db, sample()).unwrap();
        assert_eq!(created.colors, vec!["blue", "navy"]);
        assert_eq!(list(&db).unwrap().len(), 1);
        let mut changed = sample();
        changed.name = "Dark jeans".into();
        changed.style_tags = vec!["minimalist".into()];
        let updated = update(&mut db, "item-1", changed).unwrap();
        assert_eq!(updated.name, "Dark jeans");
        assert_eq!(updated.style_tags, vec!["minimalist"]);
        assert!(delete(&db, "item-1").unwrap());
        assert!(get(&db, "item-1").unwrap().is_none());
    }

    #[test]
    fn database_reopens_with_data_and_rejects_bad_input() {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("wordrop-{}-{unique}.db", std::process::id()));
        {
            let mut db = open_database(&path).unwrap();
            create(&mut db, sample()).unwrap();
            assert!(create(
                &mut db,
                ClothingItemInput {
                    name: " ".into(),
                    ..sample()
                }
            )
            .is_err());
        }
        {
            let db = open_database(&path).unwrap();
            assert_eq!(get(&db, "item-1").unwrap().unwrap().name, "Blue jeans");
        }
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
    }

    #[test]
    fn existing_phase_one_database_upgrades_to_outfit_schema() {
        let mut db = Connection::open_in_memory().unwrap();
        db.execute_batch(INITIAL_MIGRATION).unwrap();
        db.pragma_update(None, "user_version", 1).unwrap();
        migrate(&mut db).unwrap();
        let version: i64 = db
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        let outfit_table: String = db
            .query_row(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'outfits'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(version, 2);
        assert_eq!(outfit_table, "outfits");
    }
}
