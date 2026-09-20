use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

static FILE_COUNTER: AtomicU64 = AtomicU64::new(0);
const MAX_IMAGE_BYTES: u64 = 25 * 1024 * 1024;
const MAX_DISPLAY_IMAGE_BYTES: usize = 5 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedImage {
    pub reference: String,
    pub data_url: String,
}

pub fn import(root: &Path, source: &Path) -> Result<ManagedImage, String> {
    let metadata =
        fs::metadata(source).map_err(|_| "The selected image could not be opened.".to_string())?;
    if !metadata.is_file() {
        return Err("Choose an image file, not a folder.".into());
    }
    if metadata.len() > MAX_IMAGE_BYTES {
        return Err("Choose an image smaller than 25 MB.".into());
    }

    let bytes =
        fs::read(source).map_err(|_| "The selected image could not be read.".to_string())?;
    let (extension, mime) =
        detect_image(&bytes).ok_or_else(|| "Choose a JPEG, PNG, or WebP image.".to_string())?;
    let declared_extension = source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches_extension(&declared_extension, extension) {
        return Err("The file extension does not match the image contents.".into());
    }

    let directory = root.join("images").join("original");
    fs::create_dir_all(&directory)
        .map_err(|_| "The managed image folder could not be created.".to_string())?;
    let filename = unique_filename(extension);
    let destination = directory.join(&filename);
    fs::copy(source, &destination)
        .map_err(|_| "The image could not be copied into managed storage.".to_string())?;
    let reference = format!("images/original/{filename}");
    Ok(ManagedImage {
        reference,
        data_url: data_url(mime, &bytes),
    })
}

pub fn load(root: &Path, reference: &str) -> Result<ManagedImage, String> {
    let path = managed_path(root, reference)?;
    let bytes = fs::read(path)
        .map_err(|_| "This clothing image is missing from managed storage.".to_string())?;
    let (_, mime) = detect_image(&bytes)
        .ok_or_else(|| "The managed clothing image is damaged or unsupported.".to_string())?;
    Ok(ManagedImage {
        reference: reference.to_string(),
        data_url: data_url(mime, &bytes),
    })
}

pub fn save_display(root: &Path, data_url_value: &str) -> Result<ManagedImage, String> {
    let encoded = data_url_value
        .strip_prefix("data:image/jpeg;base64,")
        .ok_or_else(|| "The framed image is not a JPEG image.".to_string())?;
    let bytes = STANDARD
        .decode(encoded)
        .map_err(|_| "The framed image data is invalid.".to_string())?;
    if bytes.len() > MAX_DISPLAY_IMAGE_BYTES {
        return Err("The framed image is unexpectedly large.".into());
    }
    if detect_image(&bytes).map(|value| value.0) != Some("jpg") {
        return Err("The framed image data is damaged.".into());
    }
    let directory = root.join("images").join("display");
    fs::create_dir_all(&directory)
        .map_err(|_| "The display image folder could not be created.".to_string())?;
    let filename = unique_filename("jpg");
    let destination = directory.join(&filename);
    fs::write(&destination, &bytes)
        .map_err(|_| "The display image could not be saved.".to_string())?;
    Ok(ManagedImage {
        reference: format!("images/display/{filename}"),
        data_url: data_url("image/jpeg", &bytes),
    })
}

pub fn remove(root: &Path, reference: &str) -> Result<bool, String> {
    let path = managed_path(root, reference)?;
    match fs::remove_file(path) {
        Ok(()) => Ok(true),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(_) => Err("The managed clothing image could not be removed.".into()),
    }
}

fn managed_path(root: &Path, reference: &str) -> Result<PathBuf, String> {
    let relative = Path::new(reference);
    let valid = !relative.is_absolute()
        && relative
            .components()
            .all(|part| matches!(part, std::path::Component::Normal(_)))
        && matches!(
            reference.replace('\\', "/"),
            value if value.starts_with("images/original/") || value.starts_with("images/display/")
        );
    if !valid {
        return Err("The managed image reference is invalid.".into());
    }
    Ok(root.join(relative))
}

pub(crate) fn detect_image(bytes: &[u8]) -> Option<(&'static str, &'static str)> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(("jpg", "image/jpeg"))
    } else if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some(("png", "image/png"))
    } else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some(("webp", "image/webp"))
    } else {
        None
    }
}

fn matches_extension(declared: &str, detected: &str) -> bool {
    declared == detected || (detected == "jpg" && declared == "jpeg")
}

fn unique_filename(extension: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let counter = FILE_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{nanos:x}-{:x}-{counter:x}.{extension}", std::process::id())
}

fn data_url(mime: &str, bytes: &[u8]) -> String {
    format!("data:{mime};base64,{}", STANDARD.encode(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_directory() -> PathBuf {
        let name = unique_filename("test");
        let path = std::env::temp_dir().join(name);
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn import_copies_without_changing_source_and_uses_unique_names() {
        let root = test_directory();
        let source = root.join("source.png");
        let bytes = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3];
        fs::write(&source, bytes).unwrap();
        let first = import(&root, &source).unwrap();
        let second = import(&root, &source).unwrap();
        assert_ne!(first.reference, second.reference);
        assert_eq!(fs::read(&source).unwrap(), bytes);
        fs::remove_file(&source).unwrap();
        assert!(load(&root, &first.reference)
            .unwrap()
            .data_url
            .starts_with("data:image/png;base64,"));
        assert!(remove(&root, &first.reference).unwrap());
        assert!(load(&root, &first.reference).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn import_rejects_unsupported_or_mislabelled_files() {
        let root = test_directory();
        let text = root.join("not-an-image.png");
        fs::write(&text, b"hello").unwrap();
        assert!(import(&root, &text)
            .unwrap_err()
            .contains("JPEG, PNG, or WebP"));
        let jpeg = root.join("wrong.png");
        fs::write(&jpeg, [0xFF, 0xD8, 0xFF, 0]).unwrap();
        assert!(import(&root, &jpeg).unwrap_err().contains("does not match"));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn saves_display_images_separately_from_originals() {
        let root = test_directory();
        let jpeg = [0xFF, 0xD8, 0xFF, 0xD9];
        let encoded = format!("data:image/jpeg;base64,{}", STANDARD.encode(jpeg));
        let saved = save_display(&root, &encoded).unwrap();
        assert!(saved.reference.starts_with("images/display/"));
        assert_eq!(fs::read(root.join(&saved.reference)).unwrap(), jpeg);
        fs::remove_dir_all(root).unwrap();
    }
}
