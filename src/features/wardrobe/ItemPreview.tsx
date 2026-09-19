import { useEffect, useState } from "react";
import { loadManagedImage } from "../../lib/images/managedImages";
import type { ClothingItem } from "../../types/clothing";

const titleCase = (value: string) =>
  value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());

export function ItemPreview({
  item,
  onBack,
  onEdit,
}: {
  item: ClothingItem;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [imageError, setImageError] = useState(false);
  useEffect(() => {
    let active = true;
    loadManagedImage(item.imagePath)
      .then((image) => {
        if (active) setImageUrl(image.dataUrl);
      })
      .catch(() => {
        if (active) setImageError(true);
      });
    return () => {
      active = false;
    };
  }, [item.imagePath]);
  return (
    <section className="item-preview" aria-labelledby="item-preview-heading">
      <button className="back-button" type="button" onClick={onBack}>
        ← Back to Closet
      </button>
      <div className="item-preview-layout">
        <div className="item-preview-image">
          {imageUrl ? (
            <img src={imageUrl} alt={item.name} />
          ) : (
            <span>{imageError ? "Image unavailable" : "Loading…"}</span>
          )}
        </div>
        <div className="item-preview-copy">
          <p className="eyebrow">
            {item.ownership === "wishlist" ? "Wishlist" : "Owned"}
          </p>
          <h1 id="item-preview-heading">{item.name}</h1>
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{titleCase(item.category)}</dd>
            </div>
            {item.subtype && (
              <div>
                <dt>Subtype</dt>
                <dd>{item.subtype}</dd>
              </div>
            )}
            {item.colors.length > 0 && (
              <div>
                <dt>Colors</dt>
                <dd>{item.colors.map(titleCase).join(", ")}</dd>
              </div>
            )}
            {item.seasons.length > 0 && (
              <div>
                <dt>Seasons</dt>
                <dd>{item.seasons.map(titleCase).join(", ")}</dd>
              </div>
            )}
          </dl>
          <button className="primary-button" type="button" onClick={onEdit}>
            Edit item
          </button>
        </div>
      </div>
    </section>
  );
}
