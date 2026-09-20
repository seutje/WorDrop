use crate::website_import::{extract, web_url, WebsiteImages};
use serde::Deserialize;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::Duration;
use tauri::{
    webview::PageLoadEvent, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

const LABEL: &str = "website-image-import";
const RESULT_HOST: &str = "wordrop-import.invalid";
const MAX_RESULT_BYTES: usize = 512 * 1024;

#[derive(Default)]
pub struct BrowserImportState(Mutex<Option<Arc<AtomicBool>>>);

pub fn begin(app: &AppHandle) -> Result<Arc<AtomicBool>, String> {
    cancel(app);
    let cancelled = Arc::new(AtomicBool::new(false));
    *app.state::<BrowserImportState>()
        .0
        .lock()
        .map_err(|_| "The website window is unavailable.")? = Some(cancelled.clone());
    Ok(cancelled)
}

pub fn cancel(app: &AppHandle) {
    if let Ok(mut active) = app.state::<BrowserImportState>().0.lock() {
        if let Some(cancelled) = active.take() {
            cancelled.store(true, Ordering::SeqCst);
        }
    }
    if let Some(window) = app.get_webview_window(LABEL) {
        let _ = window.close();
    }
}

#[derive(Deserialize)]
struct PageSnapshot {
    url: String,
    html: String,
}

fn read_snapshot(payload: &str, expected_host: &str) -> Result<WebsiteImages, String> {
    if payload.len() > MAX_RESULT_BYTES {
        return Err("The website returned too much image data.".into());
    }
    let snapshot: PageSnapshot =
        serde_json::from_str(payload).map_err(|_| "The website photos could not be read.")?;
    let url = web_url(&snapshot.url)?;
    if url.host_str() != Some(expected_host) {
        return Err(
            "The website moved to a different domain. Paste its new link to try again.".into(),
        );
    }
    Ok(extract(&snapshot.html, url))
}

pub async fn find(
    app: AppHandle,
    value: &str,
    cancelled: Arc<AtomicBool>,
) -> Result<WebsiteImages, String> {
    let url = web_url(value)?;
    let host = url.host_str().ok_or("Enter a website link.")?.to_string();
    if cancelled.load(Ordering::SeqCst) {
        return Err("Website import cancelled.".into());
    }
    let (send, receive) = tokio::sync::oneshot::channel::<Result<String, String>>();
    let sender = Arc::new(Mutex::new(Some(send)));
    let navigation_sender = sender.clone();
    let navigation_host = host.clone();
    let window = WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::External(url))
        .title("Find photos — complete the website check if asked")
        .inner_size(1000.0, 740.0)
        .incognito(true)
        .devtools(false)
        .disable_drag_drop_handler()
        .on_navigation(move |url| {
            if url.host_str() == Some(RESULT_HOST) {
                if let Ok(mut sender) = navigation_sender.lock() {
                    if let Some(sender) = sender.take() {
                        let payload = if url.as_str().len() > MAX_RESULT_BYTES * 3 {
                            Err("The website returned too much image data.".into())
                        } else {
                            url.query_pairs()
                                .find(|(key, _)| key == "payload")
                                .map(|(_, value)| value.into_owned())
                                .ok_or_else(|| "The website photos could not be read.".into())
                        };
                        let _ = sender.send(payload);
                    }
                }
                return false; // The snapshot never leaves this process.
            }
            web_url(url.as_str()).is_ok() && url.host_str() == Some(navigation_host.as_str())
        })
        .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
        .on_page_load(|window, payload| {
            if matches!(payload.event(), PageLoadEvent::Finished) {
                let _ = window.eval(include_str!("website_browser_extract.js"));
            }
        })
        .build()
        .map_err(|_| {
            "The website window could not open. Try again or choose a photo from your computer."
                .to_string()
        })?;
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Destroyed) {
            if let Ok(mut sender) = sender.lock() {
                if let Some(sender) = sender.take() {
                    let _ = sender.send(Err(
                        "The website window was closed. Your item has not changed.".into(),
                    ));
                }
            }
        }
    });
    if cancelled.load(Ordering::SeqCst) {
        let _ = window.close();
        return Err("Website import cancelled.".into());
    }
    let result = tokio::time::timeout(Duration::from_secs(120), receive).await;
    let _ = window.close();
    if cancelled.load(Ordering::SeqCst) {
        return Err("Website import cancelled.".into());
    }
    let payload = result.map_err(|_| "The website did not finish loading. Try again and complete any website check, or choose a photo from your computer.")?
        .map_err(|_| "The website window was closed. Your item has not changed.")??;
    read_snapshot(&payload, &host)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_bounded_same_site_snapshots_and_reuses_native_extraction() {
        let payload = serde_json::json!({"url":"https://www.aritzia.com/product?color=30426", "html":"<img alt='Jeans' src='https://assets.aritzia.com/photo.jpg'>"}).to_string();
        let result = read_snapshot(&payload, "www.aritzia.com").unwrap();
        assert_eq!(result.images[0].url, "https://assets.aritzia.com/photo.jpg");
        assert!(read_snapshot(&payload, "other.example").is_err());
        assert!(read_snapshot(&"x".repeat(MAX_RESULT_BYTES + 1), "www.aritzia.com").is_err());
        assert!(read_snapshot("invalid", "www.aritzia.com").is_err());
    }
}
