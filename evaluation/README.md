# Local classifier evaluation

Place representative, user-approved test images in the six category folders.
Images are intentionally not committed. From `src-tauri`, run:

```powershell
cargo run --release --example evaluate_classifier -- ../evaluation resources/image-classification
```

The report includes top-1 and per-category accuracy, confusion counts, and warm
average/median/p95 latency. Use it before changing prompts or the centralized
confidence thresholds. In particular, inspect `top`/`outerwear`, `dress`/`top`,
and `accessory`/`shoes` confusion.
