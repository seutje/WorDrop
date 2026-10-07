//! Inspect the production classifier result for a local photo without changing wardrobe data.
use std::{env, path::PathBuf};
use wordrop_lib::{image_classification::State, imajev};

fn main() -> Result<(), String> {
    if wordrop_lib::run_classifier_worker() {
        return Ok(());
    }
    let image = env::args()
        .nth(1)
        .map(PathBuf::from)
        .ok_or("Supply a photo path")?;
    let resources = env::args()
        .nth(2)
        .map(PathBuf::from)
        .ok_or("Supply the FashionCLIP resources directory")?;
    let fallback = State::new(resources);
    let result = if let Some(data) = env::args().nth(3) {
        imajev::classify_with_fallback(&PathBuf::from(data), &image, &fallback)?
    } else {
        fallback.classify(&image)?
    };
    println!(
        "{}",
        serde_json::to_string(&result).map_err(|e| e.to_string())?
    );
    Ok(())
}
