import { memo, useEffect, useRef, useState } from "react";
import { loadManagedImage } from "../../lib/images/managedImages";
import type { ClothingItem } from "../../types/clothing";

export const ClothingCard = memo(function ClothingCard({
  item,
  onOpen,
}: {
  item: ClothingItem;
  onOpen: () => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    if (shouldLoad || !cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [shouldLoad]);
  useEffect(() => {
    if (!shouldLoad) return;
    let active = true;
    loadManagedImage(item.displayImagePath ?? item.imagePath)
      .then((image) => {
        if (active) setImageUrl(image.dataUrl);
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, [item.displayImagePath, item.imagePath, shouldLoad]);
  return (
    <button
      ref={cardRef}
      className="clothing-card"
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.name}`}
    >
      <div className="card-image">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <div
            className="card-placeholder"
            data-loading={!missing}
            role={missing ? "img" : undefined}
            aria-label={missing ? "Image unavailable" : undefined}
          >
            {missing ? (
              "Image unavailable"
            ) : (
              <span className="sr-only">Loading image</span>
            )}
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
});
