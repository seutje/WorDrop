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

# FashionCLIP keeps its pinned offline runtime; ImaJev uses a separate worker.
$runtimeArchive = Join-Path $env:TEMP "wordrop-onnxruntime-1.22.0.zip"
Invoke-WebRequest -Uri "https://github.com/microsoft/onnxruntime/releases/download/v1.22.0/onnxruntime-win-x64-1.22.0.zip" -OutFile $runtimeArchive
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $runtimeArchive).Hash.ToLowerInvariant() -ne "174c616efc0271194488642a72f1a514e01487da4dfe84c49296d66e40ebe0da") { throw "Runtime checksum mismatch." }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($runtimeArchive)
try {
  foreach ($name in @("onnxruntime.dll", "onnxruntime_providers_shared.dll", "LICENSE", "ThirdPartyNotices.txt")) {
    $entry = $archive.GetEntry("onnxruntime-win-x64-1.22.0/lib/$name")
    if (!$entry) { $entry = $archive.GetEntry("onnxruntime-win-x64-1.22.0/$name") }
    if (!$entry) { throw "Missing runtime resource: $name" }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $destination $name), $true)
  }
} finally { $archive.Dispose() }
Remove-Item -LiteralPath $runtimeArchive
