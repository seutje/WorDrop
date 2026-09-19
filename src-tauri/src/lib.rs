mod backup;
mod database;
mod image_store;
mod outfits;

use database::{ClothingItem, ClothingItemInput};
use outfits::{Outfit, OutfitInput};
use rusqlite::Connection;
use std::{path::PathBuf, sync::Mutex};
use tauri::{Manager, State};

struct Database(Mutex<Connection>);
struct AppDataDirectory(PathBuf);

#[tauri::command]
fn export_backup(
    app_data: State<'_, AppDataDirectory>,
    database: State<'_, Database>,
    destination_path: String,
) -> Result<backup::BackupSummary, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    backup::export(
        &app_data.0,
        &connection,
        std::path::Path::new(&destination_path),
    )
}

#[tauri::command]
fn restore_backup(
    app_data: State<'_, AppDataDirectory>,
    database: State<'_, Database>,
    source_path: String,
) -> Result<backup::BackupSummary, String> {
    let mut connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    backup::restore(
        &app_data.0,
        &mut connection,
        std::path::Path::new(&source_path),
    )
}

#[tauri::command]
fn import_clothing_image(
    app_data: State<'_, AppDataDirectory>,
    source_path: String,
) -> Result<image_store::ManagedImage, String> {
    image_store::import(&app_data.0, std::path::Path::new(&source_path))
}

#[tauri::command]
fn load_clothing_image(
    app_data: State<'_, AppDataDirectory>,
    reference: String,
) -> Result<image_store::ManagedImage, String> {
    image_store::load(&app_data.0, &reference)
}

#[tauri::command]
fn discard_clothing_image(
    app_data: State<'_, AppDataDirectory>,
    database: State<'_, Database>,
    reference: String,
) -> Result<bool, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    if database::image_reference_count(&connection, &reference)? > 0 {
        return Ok(false);
    }
    image_store::remove(&app_data.0, &reference)
}

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
    app_data: State<'_, AppDataDirectory>,
    database: State<'_, Database>,
    id: String,
    item: ClothingItemInput,
) -> Result<ClothingItem, String> {
    let mut connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    let previous = database::get(&connection, &id)?;
    let updated = database::update(&mut connection, &id, item)?;
    if let Some(previous) = previous.filter(|previous| previous.image_path != updated.image_path) {
        if database::image_reference_count(&connection, &previous.image_path)? == 0 {
            let _ = image_store::remove(&app_data.0, &previous.image_path);
        }
    }
    Ok(updated)
}

#[tauri::command]
fn delete_clothing_item(
    app_data: State<'_, AppDataDirectory>,
    database: State<'_, Database>,
    id: String,
) -> Result<bool, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    let previous = database::get(&connection, &id)?;
    let deleted = database::delete(&connection, &id)?;
    if let Some(previous) = previous {
        if database::image_reference_count(&connection, &previous.image_path)? == 0 {
            let _ = image_store::remove(&app_data.0, &previous.image_path);
        }
    }
    Ok(deleted)
}

#[tauri::command]
fn create_outfit(database: State<'_, Database>, outfit: OutfitInput) -> Result<Outfit, String> {
    let mut connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    outfits::create(&mut connection, outfit)
}

#[tauri::command]
fn get_outfit(database: State<'_, Database>, id: String) -> Result<Option<Outfit>, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    outfits::get(&connection, &id)
}

#[tauri::command]
fn list_outfits(database: State<'_, Database>) -> Result<Vec<Outfit>, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    outfits::list(&connection)
}

#[tauri::command]
fn update_outfit(
    database: State<'_, Database>,
    id: String,
    outfit: OutfitInput,
) -> Result<Outfit, String> {
    let mut connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    outfits::update(&mut connection, &id, outfit)
}

#[tauri::command]
fn delete_outfit(database: State<'_, Database>, id: String) -> Result<bool, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    outfits::delete(&connection, &id)
}

#[tauri::command]
fn list_outfits_containing_item(
    database: State<'_, Database>,
    clothing_item_id: String,
) -> Result<Vec<Outfit>, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    outfits::containing_item(&connection, &clothing_item_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let database_path = app.path().app_data_dir()?.join("wardrobe.db");
            let connection =
                database::open_database(&database_path).map_err(std::io::Error::other)?;
            app.manage(Database(Mutex::new(connection)));
            app.manage(AppDataDirectory(app.path().app_data_dir()?));
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            create_clothing_item,
            get_clothing_item,
            list_clothing_items,
            update_clothing_item,
            delete_clothing_item,
            import_clothing_image,
            load_clothing_image,
            discard_clothing_image,
            create_outfit,
            get_outfit,
            list_outfits,
            update_outfit,
            delete_outfit,
            list_outfits_containing_item,
            export_backup,
            restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
