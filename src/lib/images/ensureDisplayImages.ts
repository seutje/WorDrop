import type { ClothingItem, ClothingItemChanges } from "../../types/clothing";
import { clothingRepository } from "../database/clothingRepository";
import { renderDisplayImage } from "./imageFraming";
import {
  discardManagedImage,
  loadManagedImage,
  saveDisplayImage,
} from "./managedImages";

function changesFor(item: ClothingItem): ClothingItemChanges {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    subtype: item.subtype,
    size: item.size,
    colors: item.colors,
    material: item.material,
    pattern: item.pattern,
    seasons: item.seasons,
    occasions: item.occasions,
    styleTags: item.styleTags,
    ownership: item.ownership,
    favorite: item.favorite,
    imagePath: item.imagePath,
    displayImagePath: item.displayImagePath,
    cropZoom: item.cropZoom,
    cropX: item.cropX,
    cropY: item.cropY,
    notes: item.notes,
  };
}

export async function ensureDisplayImages(
  items: ClothingItem[],
): Promise<ClothingItem[]> {
  const result = [...items];
  for (const [index, item] of result.entries()) {
    if (item.displayImagePath) continue;
    let displayReference: string | undefined;
    try {
      const original = await loadManagedImage(item.imagePath);
      const framing = {
        zoom: item.cropZoom ?? 1,
        x: item.cropX ?? 0,
        y: item.cropY ?? 0,
      };
      const dataUrl = await renderDisplayImage(original.dataUrl, framing);
      const display = await saveDisplayImage(dataUrl);
      displayReference = display.reference;
      result[index] = await clothingRepository.update(item.id, {
        ...changesFor(item),
        displayImagePath: display.reference,
        cropZoom: framing.zoom,
        cropX: framing.x,
        cropY: framing.y,
      });
    } catch {
      if (displayReference)
        await discardManagedImage(displayReference).catch(() => undefined);
    }
  }
  return result;
}
