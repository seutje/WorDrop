use rusqlite::{params, Connection};
use serde::Serialize;

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub allow_multiple_bottoms: bool,
}

pub fn get(connection: &Connection) -> Result<AppSettings, String> {
    connection
        .query_row(
            "SELECT allow_multiple_bottoms FROM app_settings WHERE id = 1",
            [],
            |row| {
                Ok(AppSettings {
                    allow_multiple_bottoms: row.get(0)?,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_to_one_bottom_and_can_be_changed() {
        let mut db = Connection::open_in_memory().unwrap();
        crate::database::migrate(&mut db).unwrap();
        assert!(!get(&db).unwrap().allow_multiple_bottoms);
        assert!(set_allow_multiple_bottoms(&db, true)
            .unwrap()
            .allow_multiple_bottoms);
    }
}
