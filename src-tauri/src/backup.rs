use crate::{database, image_store};
use rusqlite::{backup::Backup, Connection};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use zip::{write::SimpleFileOptions, CompressionMethod, ZipArchive, ZipWriter};

const FORMAT_VERSION: u32 = 1;
const MAX_ARCHIVE_FILES: usize = 10_000;
const MAX_UNCOMPRESSED_BYTES: u64 = 2 * 1024 * 1024 * 1024;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupManifest {
    format_version: u32,
    app_version: String,
    created_at_unix_seconds: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSummary {
    pub path: String,
    pub clothing_items: usize,
    pub outfits: usize,
    pub images: usize,
}

pub fn export(
    root: &Path,
    connection: &Connection,
    destination: &Path,
) -> Result<BackupSummary, String> {
    let work = work_directory(root)?;
    let snapshot_path = work.join("wardrobe.db");
    let archive_path = work.join("wordrop-backup.wordrop");
    let result = (|| {
        let mut snapshot = Connection::open(&snapshot_path).map_err(db_error)?;
        Backup::new(connection, &mut snapshot)
            .and_then(|backup| backup.run_to_completion(64, Duration::from_millis(1), None))
            .map_err(db_error)?;
        drop(snapshot);

        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)
                .map_err(|_| "The selected backup folder could not be created.".to_string())?;
        }
        let file = File::create(&archive_path)
            .map_err(|_| "The backup file could not be created.".to_string())?;
        let mut archive = ZipWriter::new(file);
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o600);
        let manifest = BackupManifest {
            format_version: FORMAT_VERSION,
            app_version: env!("CARGO_PKG_VERSION").into(),
            created_at_unix_seconds: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };
        archive
            .start_file("manifest.json", options)
            .and_then(|_| {
                archive.write_all(
                    &serde_json::to_vec_pretty(&manifest).expect("manifest is serializable"),
                )?;
                Ok(())
            })
            .map_err(zip_error)?;
        add_file(&mut archive, &snapshot_path, "wardrobe.db", options)?;

        let mut image_count = 0;
        let images = root.join("images");
        if images.exists() {
            for path in files_beneath(&images)? {
                let relative = path
                    .strip_prefix(root)
                    .map_err(|_| "A managed image path is invalid.".to_string())?;
                let name = relative.to_string_lossy().replace('\\', "/");
                add_file(&mut archive, &path, &name, options)?;
                image_count += 1;
            }
        }
        archive
            .finish()
            .map_err(|_| "The backup archive could not be finalized.".to_string())?;
        replace_file(&archive_path, destination)?;
        Ok(BackupSummary {
            path: destination.display().to_string(),
            clothing_items: database::list(connection)?.len(),
            outfits: crate::outfits::list(connection)?.len(),
            images: image_count,
        })
    })();
    let _ = fs::remove_dir_all(work);
    result
}

pub fn restore(
    root: &Path,
    connection: &mut Connection,
    source: &Path,
) -> Result<BackupSummary, String> {
    let work = work_directory(root)?;
    let staged = work.join("staged");
    let rollback_database = work.join("rollback.db");
    fs::create_dir_all(&staged)
        .map_err(|_| "Temporary restore storage could not be created.".to_string())?;
    let result = (|| {
        extract_and_validate_archive(source, &staged)?;
        let staged_database_path = staged.join("wardrobe.db");
        let restored = database::open_database(&staged_database_path)?;
        validate_database(&restored, &staged)?;
        let clothing_items = database::list(&restored)?.len();
        let outfits = crate::outfits::list(&restored)?.len();
        let images = files_beneath(&staged.join("images"))?.len();

        let mut rollback = Connection::open(&rollback_database).map_err(db_error)?;
        copy_database(connection, &mut rollback)?;
        drop(rollback);

        let live_images = root.join("images");
        let rollback_images = work.join("previous-images");
        if live_images.exists() {
            fs::rename(&live_images, &rollback_images)
                .map_err(|_| "Existing images could not be prepared for restore.".to_string())?;
        }
        let staged_images = staged.join("images");
        let image_result = if staged_images.exists() {
            fs::rename(&staged_images, &live_images)
        } else {
            fs::create_dir_all(&live_images)
        };
        if image_result.is_err() {
            let _ = fs::rename(&rollback_images, &live_images);
            return Err("Backup images could not be restored. Existing data was kept.".into());
        }

        if let Err(error) = copy_database(&restored, connection) {
            let _ = fs::remove_dir_all(&live_images);
            let _ = fs::rename(&rollback_images, &live_images);
            if let Ok(rollback) = Connection::open(&rollback_database) {
                let _ = copy_database(&rollback, connection);
            }
            return Err(format!(
                "The database could not be restored. Existing data was recovered. {error}"
            ));
        }
        restored.close().map_err(|(_, error)| db_error(error))?;
        Ok(BackupSummary {
            path: source.display().to_string(),
            clothing_items,
            outfits,
            images,
        })
    })();
    let _ = fs::remove_dir_all(work);
    result
}

fn extract_and_validate_archive(source: &Path, destination: &Path) -> Result<(), String> {
    let file =
        File::open(source).map_err(|_| "The selected backup could not be opened.".to_string())?;
    let mut archive = ZipArchive::new(file)
        .map_err(|_| "This is not a valid WorDrop backup archive.".to_string())?;
    if archive.len() > MAX_ARCHIVE_FILES {
        return Err("This backup contains too many files.".into());
    }
    let total_size = (0..archive.len())
        .map(|index| archive.by_index(index).map(|entry| entry.size()))
        .collect::<Result<Vec<_>, _>>()
        .map_err(zip_error)?
        .into_iter()
        .try_fold(0_u64, |total, size| total.checked_add(size))
        .ok_or_else(|| "This backup reports an invalid total size.".to_string())?;
    if total_size > MAX_UNCOMPRESSED_BYTES {
        return Err("This backup is too large to restore safely.".into());
    }

    let mut names = HashSet::new();
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(zip_error)?;
        let name = entry.name().replace('\\', "/");
        let safe_components = Path::new(&name)
            .components()
            .all(|part| matches!(part, std::path::Component::Normal(_)));
        let valid = safe_components
            && (name == "manifest.json"
                || name == "wardrobe.db"
                || name.starts_with("images/original/"));
        if !valid || entry.enclosed_name().is_none() || !names.insert(name.clone()) {
            return Err("The backup contains an invalid or duplicate file path.".into());
        }
        if entry.is_dir() {
            continue;
        }
        let target = destination.join(&name);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|_| "Backup contents could not be staged.".to_string())?;
        }
        let mut output =
            File::create(target).map_err(|_| "Backup contents could not be staged.".to_string())?;
        std::io::copy(&mut entry, &mut output)
            .map_err(|_| "A file in the backup could not be read.".to_string())?;
    }
    if !names.contains("manifest.json") || !names.contains("wardrobe.db") {
        return Err("The backup is incomplete: manifest.json or wardrobe.db is missing.".into());
    }
    let manifest: BackupManifest = serde_json::from_slice(
        &fs::read(destination.join("manifest.json"))
            .map_err(|_| "The backup manifest could not be read.".to_string())?,
    )
    .map_err(|_| "The backup manifest is invalid.".to_string())?;
    if manifest.format_version != FORMAT_VERSION {
        return Err("This backup format is not supported by this version of WorDrop.".into());
    }
    Ok(())
}

fn validate_database(connection: &Connection, root: &Path) -> Result<(), String> {
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(db_error)?;
    if version > database::CURRENT_SCHEMA_VERSION {
        return Err("This backup was created by a newer version of WorDrop.".into());
    }
    let integrity: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(db_error)?;
    if integrity != "ok" {
        return Err("The backup database is damaged.".into());
    }
    for item in database::list(connection)? {
        let reference = Path::new(&item.image_path);
        if reference.is_absolute()
            || !reference
                .components()
                .all(|part| matches!(part, std::path::Component::Normal(_)))
            || !item
                .image_path
                .replace('\\', "/")
                .starts_with("images/original/")
        {
            return Err("The backup contains an invalid managed image reference.".into());
        }
        let bytes = fs::read(root.join(reference))
            .map_err(|_| format!("The backup is missing the image for ‘{}’.", item.name))?;
        if image_store::detect_image(&bytes).is_none() {
            return Err(format!("The backup image for ‘{}’ is damaged.", item.name));
        }
    }
    Ok(())
}

fn copy_database(source: &Connection, destination: &mut Connection) -> Result<(), String> {
    Backup::new(source, destination)
        .and_then(|backup| backup.run_to_completion(64, Duration::from_millis(1), None))
        .map_err(db_error)
}

fn add_file(
    archive: &mut ZipWriter<File>,
    path: &Path,
    name: &str,
    options: SimpleFileOptions,
) -> Result<(), String> {
    archive.start_file(name, options).map_err(zip_error)?;
    let mut source =
        File::open(path).map_err(|_| "A backup file could not be read.".to_string())?;
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let count = source
            .read(&mut buffer)
            .map_err(|_| "A backup file could not be read.".to_string())?;
        if count == 0 {
            break;
        }
        archive.write_all(&buffer[..count]).map_err(zip_error)?;
    }
    Ok(())
}

fn files_beneath(root: &Path) -> Result<Vec<PathBuf>, String> {
    if !root.exists() {
        return Ok(Vec::new());
    }
    let mut pending = vec![root.to_path_buf()];
    let mut files = Vec::new();
    while let Some(directory) = pending.pop() {
        for entry in fs::read_dir(directory)
            .map_err(|_| "Managed image storage could not be read.".to_string())?
        {
            let entry =
                entry.map_err(|_| "Managed image storage could not be read.".to_string())?;
            let file_type = entry
                .file_type()
                .map_err(|_| "A managed image could not be inspected.".to_string())?;
            if file_type.is_dir() {
                pending.push(entry.path());
            } else if file_type.is_file() {
                files.push(entry.path());
            }
        }
    }
    files.sort();
    Ok(files)
}

fn work_directory(root: &Path) -> Result<PathBuf, String> {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let path = root.join(format!("backup-work-{}-{unique}", std::process::id()));
    fs::create_dir_all(&path)
        .map_err(|_| "Temporary backup storage could not be created.".to_string())?;
    Ok(path)
}

fn replace_file(source: &Path, destination: &Path) -> Result<(), String> {
    let parent = destination
        .parent()
        .ok_or_else(|| "The selected backup location is invalid.".to_string())?;
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let filename = destination
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("wordrop-backup.wordrop");
    let staged = parent.join(format!(".{filename}.{unique}.tmp"));
    let previous = parent.join(format!(".{filename}.{unique}.previous"));
    fs::copy(source, &staged).map_err(|_| {
        "The finished backup could not be copied to the selected folder.".to_string()
    })?;
    if destination.exists() && fs::rename(destination, &previous).is_err() {
        let _ = fs::remove_file(&staged);
        return Err("The existing backup file could not be replaced.".into());
    }
    if fs::rename(&staged, destination).is_err() {
        let _ = fs::rename(&previous, destination);
        let _ = fs::remove_file(&staged);
        return Err("The finished backup could not be moved to the selected folder.".into());
    }
    let _ = fs::remove_file(previous);
    Ok(())
}

fn db_error(error: rusqlite::Error) -> String {
    format!("Backup database error: {error}")
}

fn zip_error(error: impl std::fmt::Display) -> String {
    format!("Backup archive error: {error}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{database::ClothingItemInput, outfits::OutfitInput};

    fn test_root() -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "wordrop-backup-test-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&root).unwrap();
        root
    }

    fn clothing() -> ClothingItemInput {
        ClothingItemInput {
            id: "item-1".into(),
            name: "Blue jeans".into(),
            category: "bottom".into(),
            subtype: Some("Jeans".into()),
            colors: vec!["blue".into()],
            material: Some("Denim".into()),
            pattern: None,
            seasons: vec!["autumn".into()],
            occasions: vec!["casual".into()],
            style_tags: vec!["classic".into()],
            ownership: "owned".into(),
            image_path: "images/original/item.png".into(),
            notes: Some("Favorite".into()),
        }
    }

    #[test]
    fn export_and_restore_preserves_database_images_outfits_and_metadata() {
        let root = test_root();
        let database_path = root.join("wardrobe.db");
        let archive_path = root.join("my-backup.wordrop");
        let image_path = root.join("images/original/item.png");
        fs::create_dir_all(image_path.parent().unwrap()).unwrap();
        let image_bytes = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 1];
        fs::write(&image_path, image_bytes).unwrap();
        let mut connection = database::open_database(&database_path).unwrap();
        database::create(&mut connection, clothing()).unwrap();
        crate::outfits::create(
            &mut connection,
            OutfitInput {
                id: "outfit-1".into(),
                name: "Weekend".into(),
                item_ids: vec!["item-1".into()],
                notes: Some("Relaxed".into()),
            },
        )
        .unwrap();

        let exported = export(&root, &connection, &archive_path).unwrap();
        assert_eq!(exported.clothing_items, 1);
        assert_eq!(exported.outfits, 1);
        assert_eq!(exported.images, 1);
        let replaced = export(&root, &connection, &archive_path).unwrap();
        assert_eq!(replaced.clothing_items, 1);
        assert!(ZipArchive::new(File::open(&archive_path).unwrap()).is_ok());

        database::delete(&connection, "item-1").unwrap();
        fs::remove_file(&image_path).unwrap();
        let restored = restore(&root, &mut connection, &archive_path).unwrap();
        assert_eq!(restored.clothing_items, 1);
        assert_eq!(restored.outfits, 1);
        assert_eq!(restored.images, 1);
        let restored_item = database::get(&connection, "item-1").unwrap().unwrap();
        assert_eq!(restored_item.colors, vec!["blue"]);
        assert_eq!(restored_item.notes.as_deref(), Some("Favorite"));
        assert_eq!(fs::read(image_path).unwrap(), image_bytes);
        assert_eq!(
            crate::outfits::list(&connection).unwrap()[0].name,
            "Weekend"
        );
        drop(connection);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn invalid_or_incomplete_archive_is_rejected_without_changing_data() {
        let root = test_root();
        let database_path = root.join("wardrobe.db");
        let invalid = root.join("invalid.wordrop");
        fs::write(&invalid, b"not a zip archive").unwrap();
        let mut connection = database::open_database(&database_path).unwrap();
        assert!(restore(&root, &mut connection, &invalid)
            .unwrap_err()
            .contains("valid WorDrop backup"));
        assert!(database::list(&connection).unwrap().is_empty());

        let incomplete = root.join("incomplete.wordrop");
        let mut archive = ZipWriter::new(File::create(&incomplete).unwrap());
        archive
            .start_file("manifest.json", SimpleFileOptions::default())
            .unwrap();
        archive
            .write_all(
                &serde_json::to_vec(&BackupManifest {
                    format_version: FORMAT_VERSION,
                    app_version: "test".into(),
                    created_at_unix_seconds: 0,
                })
                .unwrap(),
            )
            .unwrap();
        archive.finish().unwrap();
        assert!(restore(&root, &mut connection, &incomplete)
            .unwrap_err()
            .contains("incomplete"));
        drop(connection);
        fs::remove_dir_all(root).unwrap();
    }
}
