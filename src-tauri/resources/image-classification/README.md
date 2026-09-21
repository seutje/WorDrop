# FashionCLIP runtime resources

The production build bundles the pinned quantized vision encoder and
precomputed category/subtype label embeddings in this directory. Run
`scripts/download-classifier-model.ps1` to fetch and SHA-256 verify the vision
model. Run `scripts/generate-classifier-embeddings.ps1` after changing the
centralized prompts; it downloads verified build-time-only text resources and
regenerates `label_embeddings.json`. The resources are derived from
`patrickjohncyh/fashion-clip` (MIT) via `Marqo/marqo-fashionCLIP`.

The installed application does not contain or initialize the text encoder or
tokenizer. It loads normalized label vectors and retains one vision session for
all classifications.
