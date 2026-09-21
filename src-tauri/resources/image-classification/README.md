# FashionCLIP runtime resources

The production build bundles the pinned quantized vision and text encoders plus
the CLIP tokenizer in this directory. Run `scripts/download-classifier-model.ps1`
to fetch and SHA-256 verify them. They are derived from
`patrickjohncyh/fashion-clip` (MIT) via `Marqo/marqo-fashionCLIP`.

The text encoder is used once when the application initializes the classifier
to create the centralized prompt ensemble. The resulting session is discarded;
only the vision session and six normalized category vectors are retained for
all subsequent classifications.
