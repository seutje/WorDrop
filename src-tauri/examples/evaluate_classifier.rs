use std::{collections::BTreeMap, env, fs, path::PathBuf};
use wordrop_lib::image_classification::{State, CATEGORIES};

fn main() -> Result<(), String> {
    let root = env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("evaluation"));
    let resources = env::args()
        .nth(2)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("resources/image-classification"));
    let classifier = State::new(resources);
    let mut confusion: BTreeMap<String, BTreeMap<String, usize>> = BTreeMap::new();
    let mut correct = BTreeMap::<String, usize>::new();
    let mut totals = BTreeMap::<String, usize>::new();
    let mut timings = Vec::new();
    for expected in CATEGORIES {
        let directory = root.join(expected);
        if !directory.exists() {
            continue;
        }
        for entry in fs::read_dir(&directory).map_err(|e| e.to_string())? {
            let path = entry.map_err(|e| e.to_string())?.path();
            let supported = path.extension().and_then(|v| v.to_str()).is_some_and(|v| {
                ["jpg", "jpeg", "png", "webp"].contains(&v.to_ascii_lowercase().as_str())
            });
            if !supported {
                continue;
            }
            let result = classifier.classify(&path)?;
            let predicted = result.predictions[0].category.clone();
            *totals.entry(expected.into()).or_default() += 1;
            if predicted == expected {
                *correct.entry(expected.into()).or_default() += 1;
            }
            *confusion
                .entry(expected.into())
                .or_default()
                .entry(predicted)
                .or_default() += 1;
            timings.push(result.timing.total_ms - result.timing.session_initialization_ms);
        }
    }
    timings.sort_by(f64::total_cmp);
    let total: usize = totals.values().sum();
    let correct_total: usize = correct.values().sum();
    println!("total images: {total}");
    println!("top-1 accuracy: {:.1}%", percent(correct_total, total));
    for category in CATEGORIES {
        println!(
            "{category}: {:.1}% ({}/{})",
            percent(
                *correct.get(category).unwrap_or(&0),
                *totals.get(category).unwrap_or(&0)
            ),
            correct.get(category).unwrap_or(&0),
            totals.get(category).unwrap_or(&0)
        );
    }
    println!("confusion counts (expected -> predicted): {confusion:#?}");
    if !timings.is_empty() {
        let average = timings.iter().sum::<f64>() / timings.len() as f64;
        println!(
            "warm total time: average {:.1} ms, median {:.1} ms, p95 {:.1} ms",
            average,
            percentile(&timings, 0.5),
            percentile(&timings, 0.95)
        );
    }
    Ok(())
}

fn percent(value: usize, total: usize) -> f64 {
    if total == 0 {
        0.0
    } else {
        value as f64 / total as f64 * 100.0
    }
}
fn percentile(values: &[f64], quantile: f64) -> f64 {
    values[((values.len() - 1) as f64 * quantile).ceil() as usize]
}
