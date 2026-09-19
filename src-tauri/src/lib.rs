mod database;

use database::{ClothingItem, ClothingItemInput};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{Manager, State};

struct Database(Mutex<Connection>);

#[tauri::command]
fn create_clothing_item(
    database: State<'_, Database>,
    item: ClothingItemInput,
) -> Result<ClothingItem, String> {
    let mut connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    database::create(&mut connection, item)
}

#[tauri::command]
fn get_clothing_item(
    database: State<'_, Database>,
    id: String,
) -> Result<Option<ClothingItem>, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    database::get(&connection, &id)
}

#[tauri::command]
fn list_clothing_items(database: State<'_, Database>) -> Result<Vec<ClothingItem>, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    database::list(&connection)
}

#[tauri::command]
fn update_clothing_item(
    database: State<'_, Database>,
    id: String,
    item: ClothingItemInput,
) -> Result<ClothingItem, String> {
    let mut connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    database::update(&mut connection, &id, item)
}

#[tauri::command]
fn delete_clothing_item(database: State<'_, Database>, id: String) -> Result<bool, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    database::delete(&connection, &id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let database_path = app.path().app_data_dir()?.join("wardrobe.db");
            let connection =
                database::open_database(&database_path).map_err(std::io::Error::other)?;
            app.manage(Database(Mutex::new(connection)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_clothing_item,
            get_clothing_item,
            list_clothing_items,
            update_clothing_item,
            delete_clothing_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
