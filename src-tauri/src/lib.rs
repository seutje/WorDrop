mod backup;
mod database;
pub mod image_classification;
mod image_store;
mod outfits;
mod settings;
mod website_browser;
mod website_import;

use database::{ClothingItem, ClothingItemInput};
use outfits::{Outfit, OutfitInput};
use rusqlite::Connection;
use std::{path::PathBuf, sync::Mutex};
use tauri::{Manager, State};

struct Database(Mutex<Connection>);
struct AppDataDirectory(PathBuf);

#[tauri::command]
async fn find_website_images(
    app: tauri::AppHandle,
    url: String,
) -> Result<website_import::WebsiteImages, String> {
    let cancelled = website_browser::begin(&app)?;
    let result = website_import::find(&url).await;
    if cancelled.load(std::sync::atomic::Ordering::SeqCst) {
        return Err("Website import cancelled.".into());
    }
    match result {
        Err(error) if website_import::needs_browser(&error) => {
            website_browser::find(app, &url, cancelled).await
        }
        result => result,
    }
}

#[tauri::command]
fn cancel_website_image_browser(app: tauri::AppHandle) {
    website_browser::cancel(&app);
}

#[tauri::command]
async fn preview_website_image(url: String) -> Result<String, String> {
    website_import::preview(&url).await
}

#[tauri::command]
async fn import_website_image(
    app_data: State<'_, AppDataDirectory>,
    url: String,
) -> Result<image_store::ManagedImage, String> {
    website_import::import(&url, app_data.0.clone()).await
}

#[tauri::command]
async fn classify_clothing_image(
    app_data: State<'_, AppDataDirectory>,
    classifier: State<'_, image_classification::State>,
    reference: String,
) -> Result<image_classification::ClassificationResult, String> {
    let relative = std::path::Path::new(&reference);
    if relative.is_absolute()
        || !relative
            .components()
            .all(|part| matches!(part, std::path::Component::Normal(_)))
        || !reference.replace('\\', "/").starts_with("images/")
    {
        return Err("The clothing image reference is invalid.".into());
    }
    let path = app_data.0.join(relative);
    let classifier = classifier.inner().clone();
    tauri::async_runtime::spawn_blocking(move || classifier.classify(&path))
        .await
        .map_err(|_| "The local image classifier stopped unexpectedly.".to_string())?
}

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
fn save_display_image(
    app_data: State<'_, AppDataDirectory>,
    data_url: String,
) -> Result<image_store::ManagedImage, String> {
    image_store::save_display(&app_data.0, &data_url)
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
fn set_clothing_item_favorite(
    database: State<'_, Database>,
    id: String,
    favorite: bool,
) -> Result<ClothingItem, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    database::set_favorite(&connection, &id, favorite)
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
    if let Some(previous) = previous {
        for reference in [Some(previous.image_path), previous.display_image_path]
            .into_iter()
            .flatten()
            .filter(|reference| {
                reference != &updated.image_path
                    && updated.display_image_path.as_ref() != Some(reference)
            })
        {
            if database::image_reference_count(&connection, &reference)? == 0 {
                let _ = image_store::remove(&app_data.0, &reference);
            }
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
        for reference in [Some(previous.image_path), previous.display_image_path]
            .into_iter()
            .flatten()
        {
            if database::image_reference_count(&connection, &reference)? == 0 {
                let _ = image_store::remove(&app_data.0, &reference);
            }
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
fn set_outfit_favorite(
    database: State<'_, Database>,
    id: String,
    favorite: bool,
) -> Result<Outfit, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    outfits::set_favorite(&connection, &id, favorite)
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

#[tauri::command]
fn get_app_settings(database: State<'_, Database>) -> Result<settings::AppSettings, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    settings::get(&connection)
}

#[tauri::command]
fn set_allow_multiple_bottoms(
    database: State<'_, Database>,
    allow: bool,
) -> Result<settings::AppSettings, String> {
    let connection = database
        .0
        .lock()
        .map_err(|_| "The local database is unavailable.".to_string())?;
    settings::set_allow_multiple_bottoms(&connection, allow)
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
            app.manage(website_browser::BrowserImportState::default());
            app.manage(image_classification::State::new(
                app.path().resource_dir()?.join("image-classification"),
            ));
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            create_clothing_item,
            get_clothing_item,
            list_clothing_items,
            set_clothing_item_favorite,
            update_clothing_item,
            delete_clothing_item,
            import_clothing_image,
            classify_clothing_image,
            find_website_images,
            cancel_website_image_browser,
            preview_website_image,
            import_website_image,
            load_clothing_image,
            save_display_image,
            discard_clothing_image,
            create_outfit,
            get_outfit,
            list_outfits,
            set_outfit_favorite,
            update_outfit,
            delete_outfit,
            list_outfits_containing_item,
            get_app_settings,
            set_allow_multiple_bottoms,
            export_backup,
            restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
