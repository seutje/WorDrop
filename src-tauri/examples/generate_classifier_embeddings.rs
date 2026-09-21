use ndarray::Array2;
use ort::{inputs, session::Session, value::TensorRef};
use serde::Serialize;
use std::{env, fs, path::PathBuf};
use tokenizers::{PaddingParams, PaddingStrategy, Tokenizer, TruncationParams};
use wordrop_lib::image_classification_vocabulary::{LabelDefinition, CATEGORY_PROMPTS, SUBTYPES};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EmbeddingResource {
    model: &'static str,
    dimensions: usize,
    categories: Vec<Vec<f32>>,
    subtypes: Vec<Vec<f32>>,
}

fn main() -> Result<(), String> {
    let resources = env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("resources/image-classification"));
    let mut session = Session::builder()
        .map_err(message)?
        .commit_from_file(resources.join("text_model_int8.onnx"))
        .map_err(message)?;
    let mut tokenizer = Tokenizer::from_file(resources.join("tokenizer.json")).map_err(message)?;
    tokenizer.with_padding(Some(PaddingParams {
        strategy: PaddingStrategy::Fixed(77),
        ..Default::default()
    }));
    tokenizer
        .with_truncation(Some(TruncationParams {
            max_length: 77,
            ..Default::default()
        }))
        .map_err(message)?;
    let categories = CATEGORY_PROMPTS
        .iter()
        .map(|definition| embed(definition, &tokenizer, &mut session))
        .collect::<Result<_, _>>()?;
    let subtypes = SUBTYPES
        .iter()
        .map(|definition| embed(definition, &tokenizer, &mut session))
        .collect::<Result<_, _>>()?;
    let output = EmbeddingResource {
        model: "patrickjohncyh/fashion-clip (Marqo int8 text export)",
        dimensions: 512,
        categories,
        subtypes,
    };
    fs::write(
        resources.join("label_embeddings.json"),
        serde_json::to_vec(&output).map_err(message)?,
    )
    .map_err(message)?;
    Ok(())
}

fn embed(
    definition: &LabelDefinition,
    tokenizer: &Tokenizer,
    session: &mut Session,
) -> Result<Vec<f32>, String> {
    let mut average = vec![0.0f32; 512];
    for prompt in definition.prompts {
        let encoding = tokenizer.encode(*prompt, true).map_err(message)?;
        let ids = Array2::from_shape_vec(
            (1, 77),
            encoding
                .get_ids()
                .iter()
                .map(|&value| value as i64)
                .collect(),
        )
        .map_err(message)?;
        let outputs = session
            .run(inputs!["input_ids" => TensorRef::from_array_view(&ids).map_err(message)?])
            .map_err(message)?;
        let (_, values) = outputs["text_embeds"]
            .try_extract_tensor::<f32>()
            .map_err(message)?;
        let vector = normalize(values)?;
        for (target, value) in average.iter_mut().zip(vector) {
            *target += value;
        }
    }
    for value in &mut average {
        *value /= definition.prompts.len() as f32;
    }
    normalize(&average)
}

fn normalize(values: &[f32]) -> Result<Vec<f32>, String> {
    let norm = values.iter().map(|value| value * value).sum::<f32>().sqrt();
    if !norm.is_finite() || norm <= f32::EPSILON {
        return Err("Embedding has no usable magnitude.".into());
    }
    Ok(values.iter().map(|value| value / norm).collect())
}

fn message(error: impl std::fmt::Display) -> String {
    error.to_string()
}
