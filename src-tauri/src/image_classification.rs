use image::imageops::FilterType;
use ndarray::{Array2, Array4};
use ort::{inputs, session::Session, value::TensorRef};
use serde::Serialize;
use std::{
    cmp::Ordering,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::Instant,
};
use tokenizers::{PaddingParams, PaddingStrategy, Tokenizer, TruncationParams};

pub const CATEGORIES: [&str; 6] = ["top", "bottom", "dress", "shoes", "outerwear", "accessory"];
pub const PROMPTS: [(&str, &[&str]); 6] = [
    (
        "top",
        &[
            "a photo of a top",
            "an upper-body garment",
            "a shirt, t-shirt, blouse, sweater, hoodie, or similar upper-body clothing",
        ],
    ),
    (
        "bottom",
        &[
            "a photo of bottoms",
            "a lower-body garment",
            "pants, trousers, jeans, shorts, or a skirt",
        ],
    ),
    (
        "dress",
        &[
            "a photo of a dress",
            "a one-piece dress garment",
            "a full-body garment worn as one piece",
        ],
    ),
    (
        "shoes",
        &[
            "a photo of shoes",
            "footwear",
            "sneakers, boots, sandals, heels, or formal shoes",
        ],
    ),
    (
        "outerwear",
        &[
            "a photo of outerwear",
            "an outer layer garment",
            "a jacket, coat, blazer, parka, or similar outer layer",
        ],
    ),
    (
        "accessory",
        &[
            "a photo of a fashion accessory",
            "an accessory worn or carried with clothing",
            "a bag, belt, hat, scarf, jewelry, or similar item",
        ],
    ),
];

pub const MIN_TOP_SCORE: f32 = 0.42;
pub const MIN_MARGIN: f32 = 0.08;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Prediction {
    pub category: String,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationTiming {
    pub session_initialization_ms: f64,
    pub image_decode_preprocessing_ms: f64,
    pub model_inference_ms: f64,
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
}

impl Classifier {
    fn load(resources: &Path) -> Result<Self, String> {
        let mut text = Session::builder()
            .map_err(ml_error)?
            .commit_from_file(resources.join("text_model_int8.onnx"))
            .map_err(ml_error)?;
        let mut tokenizer = Tokenizer::from_file(resources.join("tokenizer.json"))
            .map_err(|e| format!("Could not load the FashionCLIP tokenizer: {e}"))?;
        tokenizer.with_padding(Some(PaddingParams {
            strategy: PaddingStrategy::Fixed(77),
            ..Default::default()
        }));
        tokenizer
            .with_truncation(Some(TruncationParams {
                max_length: 77,
                ..Default::default()
            }))
            .map_err(|e| e.to_string())?;
        let mut category_embeddings = Vec::with_capacity(PROMPTS.len());
        for (_, prompts) in PROMPTS {
            let mut average = vec![0.0f32; 512];
            for prompt in prompts {
                let encoding = tokenizer.encode(*prompt, true).map_err(|e| e.to_string())?;
                let ids = Array2::from_shape_vec(
                    (1, 77),
                    encoding.get_ids().iter().map(|&v| v as i64).collect(),
                )
                .map_err(|e| e.to_string())?;
                let outputs = text
                    .run(
                        inputs!["input_ids" => TensorRef::from_array_view(&ids).map_err(ml_error)?],
                    )
                    .map_err(ml_error)?;
                let (_, values) = outputs["text_embeds"]
                    .try_extract_tensor::<f32>()
                    .map_err(ml_error)?;
                let normalized = normalize(values);
                for (target, value) in average.iter_mut().zip(normalized) {
                    *target += value;
                }
            }
            for value in &mut average {
                *value /= prompts.len() as f32;
            }
            category_embeddings.push(normalize(&average));
        }
        drop(text);
        let vision = Session::builder()
            .map_err(ml_error)?
            .commit_from_file(resources.join("vision_model_q4.onnx"))
            .map_err(ml_error)?;
        Ok(Self {
            vision,
            category_embeddings,
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
        let std = [0.26862954, 0.26130258, 0.27577711];
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
        let scoring_ms = scoring.elapsed().as_secs_f64() * 1000.0;
        Ok(ClassificationResult {
            confidence_score: predictions[0].score,
            top_two_margin: margin,
            suggested_category: suggested,
            predictions,
            timing: ClassificationTiming {
                session_initialization_ms: init_ms,
                image_decode_preprocessing_ms: preprocessing_ms,
                model_inference_ms: inference_ms,
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
        assert_eq!(PROMPTS.len(), CATEGORIES.len());
        for (index, (category, prompts)) in PROMPTS.iter().enumerate() {
            assert_eq!(*category, CATEGORIES[index]);
            assert!(prompts.len() >= 2);
        }
    }
    #[test]
    fn normalized_vectors_have_unit_length() {
        let result = normalize(&[3.0, 4.0]);
        assert!((dot(&result, &result) - 1.0).abs() < 0.0001);
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
