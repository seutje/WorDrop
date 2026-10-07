use rusqlite::{params, Connection};
use serde::Serialize;

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub allow_multiple_bottoms: bool,
    pub classifier: String,
}

pub fn get(connection: &Connection) -> Result<AppSettings, String> {
    connection
        .query_row(
            "SELECT allow_multiple_bottoms, classifier FROM app_settings WHERE id = 1",
            [],
            |row| {
                Ok(AppSettings {
                    allow_multiple_bottoms: row.get(0)?,
                    classifier: row.get(1)?,
                })
            },
        )
        .map_err(db_error)
}

pub fn set_allow_multiple_bottoms(
    connection: &Connection,
    allow: bool,
) -> Result<AppSettings, String> {
    connection
        .execute(
            "UPDATE app_settings SET allow_multiple_bottoms = ?1 WHERE id = 1",
            params![allow],
        )
        .map_err(db_error)?;
    get(connection)
}

fn db_error(error: rusqlite::Error) -> String {
    format!("Local settings error: {error}")
}

pub fn set_classifier(connection: &Connection, classifier: &str) -> Result<AppSettings, String> {
    if !matches!(classifier, "fashionclip" | "imajev") {
        return Err("Choose a supported image classifier.".into());
    }
    connection
        .execute(
            "UPDATE app_settings SET classifier = ?1 WHERE id = 1",
            [classifier],
        )
        .map_err(db_error)?;
    get(connection)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_to_one_bottom_and_can_be_changed() {
        let mut db = Connection::open_in_memory().unwrap();
        crate::database::migrate(&mut db).unwrap();
        assert!(!get(&db).unwrap().allow_multiple_bottoms);
        assert_eq!(get(&db).unwrap().classifier, "fashionclip");
        assert_eq!(set_classifier(&db, "imajev").unwrap().classifier, "imajev");
        assert!(set_classifier(&db, "remote").is_err());
        assert!(
            set_allow_multiple_bottoms(&db, true)
                .unwrap()
                .allow_multiple_bottoms
        );
        assert_eq!(get(&db).unwrap().classifier, "imajev");
        crate::database::migrate(&mut db).unwrap();
        assert_eq!(get(&db).unwrap().classifier, "imajev");
    }
}
