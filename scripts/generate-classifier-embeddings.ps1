$ErrorActionPreference = "Stop"
$repository = Join-Path $PSScriptRoot ".."
$temporary = Join-Path $repository "src-tauri\target\classifier-embedding-build"
$resources = Join-Path $repository "src-tauri\resources\image-classification"
New-Item -ItemType Directory -Force -Path $temporary | Out-Null

$files = @(
  @("text_model_int8.onnx", "https://huggingface.co/Marqo/marqo-fashionCLIP/resolve/main/onnx/text_model_int8.onnx", "2a941099c0a03b7b5535eb5e541c76170a821c1ba19169e95cf137fe064d4d3c"),
  @("tokenizer.json", "https://huggingface.co/Marqo/marqo-fashionCLIP/resolve/main/tokenizer.json", "d2c22662278b8c26ed9ffb46428534fdda1a9f60de2fbec87b2c4377e775d1ac")
)

foreach ($file in $files) {
  $path = Join-Path $temporary $file[0]
  Invoke-WebRequest -Uri $file[1] -OutFile $path
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
  if ($actual -ne $file[2]) { throw "Checksum mismatch for $($file[0])." }
}

& (Join-Path $PSScriptRoot "cargo.ps1") run --release --manifest-path (Join-Path $repository "src-tauri\Cargo.toml") --example generate_classifier_embeddings -- $temporary
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Copy-Item -Force -LiteralPath (Join-Path $temporary "label_embeddings.json") -Destination $resources
