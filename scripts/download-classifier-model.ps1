$ErrorActionPreference = "Stop"
$destination = Join-Path $PSScriptRoot "..\src-tauri\resources\image-classification"
New-Item -ItemType Directory -Force -Path $destination | Out-Null

$files = @(
  @("vision_model_q4.onnx", "https://huggingface.co/Marqo/marqo-fashionCLIP/resolve/main/onnx/vision_model_q4.onnx", "047e48d824a4f12c0b0651a703341ec8a2468bf4ceb214fc15cbe042ae96dd96")
)

foreach ($file in $files) {
  $path = Join-Path $destination $file[0]
  Invoke-WebRequest -Uri $file[1] -OutFile $path
  if ($file[2]) {
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($actual -ne $file[2]) { throw "Checksum mismatch for $($file[0])." }
  }
}
