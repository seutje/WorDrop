import { useEffect, useState } from "react";
import { loadManagedImage } from "../../lib/images/managedImages";
import type { ClothingItem } from "../../types/clothing";

export function ClothingCard({
  item,
  onEdit,
}: {
  item: ClothingItem;
  onEdit: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true;
    loadManagedImage(item.imagePath)
      .then((image) => {
        if (active) setImageUrl(image.dataUrl);
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, [item.imagePath]);
  return (
    <button
      className="clothing-card"
      type="button"
      onClick={onEdit}
      aria-label={`Edit ${item.name}`}
    >
      <div className="card-image">
        {imageUrl ? (
          <img src={imageUrl} alt="" />
        ) : (
          <div
            className="card-placeholder"
            role={missing ? "img" : undefined}
            aria-label={missing ? "Image unavailable" : undefined}
          >
            {missing ? "Image unavailable" : "Loading…"}
          </div>
        )}
      </div>
      <div className="card-copy">
        <strong>{item.name}</strong>
        <span>{item.subtype || item.category}</span>
        <small data-wishlist={item.ownership === "wishlist"}>
          {item.ownership === "wishlist" ? "♥ Wishlist" : "● Owned"}
        </small>
      </div>
    </button>
  );
}
