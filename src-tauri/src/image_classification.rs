use crate::image_classification_vocabulary::{CATEGORY_PROMPTS, SUBTYPES};
use image::imageops::FilterType;
use ndarray::Array4;
use ort::{inputs, session::Session, value::TensorRef};
use serde::{Deserialize, Serialize};
use std::{
    cmp::Ordering,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::Instant,
};

pub const CATEGORIES: [&str; 6] = ["top", "bottom", "dress", "shoes", "outerwear", "accessory"];
pub const MIN_TOP_SCORE: f32 = 0.42;
pub const MIN_MARGIN: f32 = 0.08;
pub const MIN_SUBTYPE_SCORE: f32 = 0.32;
pub const MIN_SUBTYPE_MARGIN: f32 = 0.10;
const EMBEDDING_DIMENSIONS: usize = 512;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Prediction {
    pub category: String,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtypePrediction {
    pub subtype: String,
    pub category: String,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationTiming {
    pub session_initialization_ms: f64,
    pub image_decode_preprocessing_ms: f64,
    pub model_inference_ms: f64,
    pub category_scoring_ms: f64,
    pub subtype_scoring_ms: f64,
    pub scoring_ms: f64,
    pub total_ms: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationResult {
    pub predictions: Vec<Prediction>,
    pub suggested_category: Option<String>,
    pub confidence_score: f32,
    pub top_two_margin: f32,
    pub subtype_predictions: Vec<SubtypePrediction>,
    pub suggested_subtype: Option<String>,
    pub subtype_confidence_score: Option<f32>,
    pub subtype_top_two_margin: Option<f32>,
    pub timing: ClassificationTiming,
}

#[derive(Clone)]
pub struct State {
    resources: PathBuf,
    classifier: Arc<Mutex<Option<Classifier>>>,
}

impl State {
    pub fn new(resources: PathBuf) -> Self {
        Self {
            resources,
            classifier: Arc::new(Mutex::new(None)),
        }
    }

    pub fn classify(&self, image_path: &Path) -> Result<ClassificationResult, String> {
        let total = Instant::now();
        let mut guard = self
            .classifier
            .lock()
            .map_err(|_| "The image classifier is unavailable.".to_string())?;
        let init = if guard.is_none() {
            let started = Instant::now();
            *guard = Some(Classifier::load(&self.resources)?);
            started.elapsed().as_secs_f64() * 1000.0
        } else {
            0.0
        };
        guard.as_mut().unwrap().classify(image_path, init, total)
    }
}

struct Classifier {
    vision: Session,
    category_embeddings: Vec<Vec<f32>>,
    subtype_embeddings: Option<Vec<Vec<f32>>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EmbeddingResource {
    dimensions: usize,
    categories: Vec<Vec<f32>>,
    subtypes: Vec<Vec<f32>>,
}

impl Classifier {
    fn load(resources: &Path) -> Result<Self, String> {
        let bytes = std::fs::read(resources.join("label_embeddings.json"))
            .map_err(|error| format!("Could not load classifier label embeddings: {error}"))?;
        let embeddings: EmbeddingResource = serde_json::from_slice(&bytes)
            .map_err(|error| format!("Classifier label embeddings are malformed: {error}"))?;
        validate_embeddings(
            &embeddings.categories,
            CATEGORY_PROMPTS.len(),
            embeddings.dimensions,
        )?;
        let subtype_embeddings =
            usable_subtype_embeddings(embeddings.subtypes, embeddings.dimensions);
        let vision = Session::builder()
            .map_err(ml_error)?
            .commit_from_file(resources.join("vision_model_q4.onnx"))
            .map_err(ml_error)?;
        Ok(Self {
            vision,
            category_embeddings: embeddings.categories,
            subtype_embeddings,
        })
    }

    fn classify(
        &mut self,
        image_path: &Path,
        init_ms: f64,
        total: Instant,
    ) -> Result<ClassificationResult, String> {
        let preprocessing = Instant::now();
        let image = image::open(image_path)
            .map_err(|e| format!("The photo could not be decoded for classification: {e}"))?
            .to_rgb8();
        let (width, height) = image.dimensions();
        let scale = 224.0 / width.min(height) as f32;
        let resized = image::imageops::resize(
            &image,
            (width as f32 * scale).round() as u32,
            (height as f32 * scale).round() as u32,
            FilterType::Triangle,
        );
        let x = (resized.width() - 224) / 2;
        let y = (resized.height() - 224) / 2;
        let cropped = image::imageops::crop_imm(&resized, x, y, 224, 224).to_image();
        let mean = [0.48145466, 0.4578275, 0.40821073];
        let std = [0.26862954, 0.261_302_6, 0.275_777_1];
        let mut pixels = Array4::<f32>::zeros((1, 3, 224, 224));
        for (px, py, pixel) in cropped.enumerate_pixels() {
            for channel in 0..3 {
                pixels[[0, channel, py as usize, px as usize]] =
                    (pixel[channel] as f32 / 255.0 - mean[channel]) / std[channel];
            }
        }
        let preprocessing_ms = preprocessing.elapsed().as_secs_f64() * 1000.0;
        let inference = Instant::now();
        let outputs = self
            .vision
            .run(inputs!["pixel_values" => TensorRef::from_array_view(&pixels).map_err(ml_error)?])
            .map_err(ml_error)?;
        let (_, raw) = outputs["image_embeds"]
            .try_extract_tensor::<f32>()
            .map_err(ml_error)?;
        let image_embedding = normalize(raw);
        let inference_ms = inference.elapsed().as_secs_f64() * 1000.0;
        let scoring = Instant::now();
        let category_scoring = Instant::now();
        let logits: Vec<f32> = self
            .category_embeddings
            .iter()
            .map(|category| dot(&image_embedding, category) / 0.07)
            .collect();
        let max = logits.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        let denominator: f32 = logits.iter().map(|value| (*value - max).exp()).sum();
        let mut predictions: Vec<_> = CATEGORIES
            .iter()
            .zip(logits)
            .map(|(category, value)| Prediction {
                category: (*category).into(),
                score: (value - max).exp() / denominator,
            })
            .collect();
        predictions.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal));
        let margin = predictions[0].score - predictions[1].score;
        let suggested = (predictions[0].score >= MIN_TOP_SCORE && margin >= MIN_MARGIN)
            .then(|| predictions[0].category.clone());
        let category_scoring_ms = category_scoring.elapsed().as_secs_f64() * 1000.0;
        let subtype_scoring = Instant::now();
        let subtype_predictions = self
            .subtype_embeddings
            .as_ref()
            .map(|embeddings| rank_subtypes(&image_embedding, &predictions[0].category, embeddings))
            .unwrap_or_default();
        let subtype_confidence_score = subtype_predictions
            .first()
            .map(|prediction| prediction.score);
        let subtype_top_two_margin = subtype_predictions
            .first()
            .zip(subtype_predictions.get(1))
            .map(|(first, second)| first.score - second.score);
        let suggested_subtype = suggested
            .as_ref()
            .and_then(|_| select_subtype(&subtype_predictions));
        let subtype_scoring_ms = subtype_scoring.elapsed().as_secs_f64() * 1000.0;
        let scoring_ms = scoring.elapsed().as_secs_f64() * 1000.0;
        Ok(ClassificationResult {
            confidence_score: predictions[0].score,
            top_two_margin: margin,
            suggested_category: suggested,
            subtype_predictions,
            suggested_subtype,
            subtype_confidence_score,
            subtype_top_two_margin,
            predictions,
            timing: ClassificationTiming {
                session_initialization_ms: init_ms,
                image_decode_preprocessing_ms: preprocessing_ms,
                model_inference_ms: inference_ms,
                category_scoring_ms,
                subtype_scoring_ms,
                scoring_ms,
                total_ms: total.elapsed().as_secs_f64() * 1000.0,
            },
        })
    }
}

fn normalize(values: &[f32]) -> Vec<f32> {
    let norm = values.iter().map(|v| v * v).sum::<f32>().sqrt();
    values.iter().map(|v| v / norm).collect()
}
fn validate_embeddings(
    embeddings: &[Vec<f32>],
    expected_count: usize,
    dimensions: usize,
) -> Result<(), String> {
    if dimensions != EMBEDDING_DIMENSIONS
        || embeddings.len() != expected_count
        || embeddings.iter().any(|embedding| {
            embedding.len() != EMBEDDING_DIMENSIONS
                || embedding.iter().any(|value| !value.is_finite())
        })
    {
        return Err("Classifier label embeddings have unexpected dimensions.".into());
    }
    Ok(())
}

fn usable_subtype_embeddings(
    embeddings: Vec<Vec<f32>>,
    dimensions: usize,
) -> Option<Vec<Vec<f32>>> {
    validate_embeddings(&embeddings, SUBTYPES.len(), dimensions)
        .ok()
        .map(|()| embeddings)
}

fn rank_subtypes(
    image_embedding: &[f32],
    category: &str,
    subtype_embeddings: &[Vec<f32>],
) -> Vec<SubtypePrediction> {
    let candidates: Vec<_> = SUBTYPES
        .iter()
        .zip(subtype_embeddings)
        .filter(|(definition, _)| definition.category == category)
        .collect();
    if candidates.is_empty() {
        return Vec::new();
    }
    let logits: Vec<f32> = candidates
        .iter()
        .map(|(_, embedding)| dot(image_embedding, embedding) / 0.07)
        .collect();
    let max = logits.iter().copied().fold(f32::NEG_INFINITY, f32::max);
    let denominator: f32 = logits.iter().map(|value| (*value - max).exp()).sum();
    let mut predictions: Vec<_> = candidates
        .into_iter()
        .zip(logits)
        .map(|((definition, _), value)| SubtypePrediction {
            subtype: definition.name.into(),
            category: definition.category.into(),
            score: (value - max).exp() / denominator,
        })
        .collect();
    predictions.sort_by(|left, right| {
        right
            .score
            .partial_cmp(&left.score)
            .unwrap_or(Ordering::Equal)
    });
    predictions
}

fn select_subtype(predictions: &[SubtypePrediction]) -> Option<String> {
    let (first, second) = predictions.first().zip(predictions.get(1))?;
    (first.score >= MIN_SUBTYPE_SCORE && first.score - second.score >= MIN_SUBTYPE_MARGIN)
        .then(|| first.subtype.clone())
}

fn dot(left: &[f32], right: &[f32]) -> f32 {
    left.iter().zip(right).map(|(a, b)| a * b).sum()
}
fn ml_error(error: impl std::fmt::Display) -> String {
    format!("Local FashionCLIP inference failed: {error}")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn taxonomy_and_prompts_stay_aligned() {
        assert_eq!(CATEGORY_PROMPTS.len(), CATEGORIES.len());
        for (index, definition) in CATEGORY_PROMPTS.iter().enumerate() {
            assert_eq!(definition.name, CATEGORIES[index]);
            assert!(!definition.prompts.is_empty());
        }
    }
    #[test]
    fn subtype_vocabulary_is_unique_valid_and_category_scoped() {
        let mut names = std::collections::HashSet::new();
        for definition in SUBTYPES {
            assert!(names.insert(definition.name));
            assert!(CATEGORIES.contains(&definition.category));
            assert!(!definition.prompts.is_empty());
            assert!(definition
                .prompts
                .iter()
                .all(|prompt| !prompt.trim().is_empty()));
        }
        assert!(SUBTYPES
            .iter()
            .any(|definition| definition.generic_fallback));
        assert!(CATEGORIES
            .iter()
            .all(|category| SUBTYPES.iter().any(|subtype| subtype.category == *category)));
    }
    #[test]
    fn normalized_vectors_have_unit_length() {
        let result = normalize(&[3.0, 4.0]);
        assert!((dot(&result, &result) - 1.0).abs() < 0.0001);
    }
    #[test]
    fn subtype_ranking_filters_category_and_orders_similarity() {
        let dimensions = EMBEDDING_DIMENSIONS;
        let mut embeddings = vec![vec![0.0; dimensions]; SUBTYPES.len()];
        for (index, embedding) in embeddings.iter_mut().enumerate() {
            embedding[index % dimensions] = 1.0;
        }
        let top_index = SUBTYPES
            .iter()
            .position(|definition| definition.name == "T-shirt")
            .unwrap();
        let ranked = rank_subtypes(&embeddings[top_index], "top", &embeddings);
        assert_eq!(ranked[0].subtype, "T-shirt");
        assert!(ranked.iter().all(|prediction| prediction.category == "top"));
        assert!(!ranked
            .iter()
            .any(|prediction| prediction.subtype == "Jeans"));
        assert!(ranked[0].score > ranked[1].score);
    }
    #[test]
    fn malformed_embedding_resources_fail_validation() {
        assert!(validate_embeddings(&[vec![0.0; 511]], 1, 512).is_err());
        assert!(validate_embeddings(&[vec![f32::NAN; 512]], 1, 512).is_err());
        assert!(usable_subtype_embeddings(vec![vec![0.0; 511]], 512).is_none());
    }
    #[test]
    fn subtype_threshold_requires_score_and_margin() {
        let prediction = |name: &str, score| SubtypePrediction {
            subtype: name.into(),
            category: "top".into(),
            score,
        };
        assert_eq!(
            select_subtype(&[prediction("T-shirt", 0.60), prediction("Polo", 0.20)]),
            Some("T-shirt".into())
        );
        assert_eq!(
            select_subtype(&[prediction("T-shirt", 0.31), prediction("Polo", 0.10)]),
            None
        );
        assert_eq!(
            select_subtype(&[prediction("T-shirt", 0.45), prediction("Polo", 0.40)]),
            None
        );
    }
    #[test]
    #[ignore = "loads the bundled model and is intentionally excluded from the fast offline suite"]
    fn bundled_model_smoke_test() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let classifier = State::new(root.join("resources/image-classification"));
        let result = classifier.classify(&root.join("../design.png")).unwrap();
        let warm = classifier.classify(&root.join("../design.png")).unwrap();
        eprintln!(
            "cold timing: {:?}; warm timing: {:?}",
            result.timing, warm.timing
        );
        assert_eq!(result.predictions.len(), 6);
        assert!(result.timing.model_inference_ms > 0.0);
        assert_eq!(warm.timing.session_initialization_ms, 0.0);
    }
}
