//! Interactive native smoke test, without opening or modifying a wardrobe.
//! cargo run --example website_import_smoke -- "https://shop.example/product"
#![allow(dead_code)]

#[path = "../src/image_store.rs"]
mod image_store;
#[path = "../src/website_browser.rs"]
mod website_browser;
#[path = "../src/website_import.rs"]
mod website_import;

fn main() {
    let url = std::env::args()
        .nth(1)
        .expect("Provide a public product URL");
    let mut context = tauri::generate_context!();
    context.config_mut().app.windows.clear();
    tauri::Builder::default()
        .manage(website_browser::BrowserImportState::default())
        .setup(move |app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let result = async {
                    let cancelled = website_browser::begin(&handle)?;
                    let images = match website_import::find(&url).await {
                        Err(error) if website_import::needs_browser(&error) => {
                            println!("Opening the native website window; complete any website check if asked.");
                            website_browser::find(handle.clone(), &url, cancelled).await?
                        }
                        result => result?,
                    };
                    println!("Found {} image candidates", images.images.len());
                    let first = images.images.first().ok_or("No image candidates found")?;
                    website_import::preview(&first.url).await?;
                    println!("First preview decoded successfully");
                    let root = std::env::temp_dir().join(format!("wordrop-browser-smoke-{}", std::process::id()));
                    let imported = website_import::import(&first.url, root.clone()).await?;
                    image_store::load(&root, &imported.reference)?;
                    image_store::remove(&root, &imported.reference)?;
                    let _ = std::fs::remove_dir_all(root);
                    println!("Selected original imported, reloaded, and cleaned up successfully");
                    Ok::<(), String>(())
                }.await;
                if let Err(error) = &result { eprintln!("Import failed: {error}"); }
                handle.exit(if result.is_ok() { 0 } else { 1 });
            });
            Ok(())
        })
        .build(context).expect("Native website smoke test could not start")
        .run(|_, event| {
            // Keep the harness alive after its only window closes so the
            // selected original can still be downloaded and validated.
            if let tauri::RunEvent::ExitRequested { api, code: None, .. } = event {
                api.prevent_exit();
            }
        });
}
