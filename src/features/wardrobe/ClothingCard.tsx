import { memo, useEffect, useRef, useState } from "react";
import { loadManagedImage } from "../../lib/images/managedImages";
import type { ClothingItem } from "../../types/clothing";

export const ClothingCard = memo(function ClothingCard({
  item,
  onOpen,
  onToggleFavorite,
}: {
  item: ClothingItem;
  onOpen: () => void;
  onToggleFavorite: () => Promise<void>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
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

  async function toggleFavorite() {
    setFavoriteBusy(true);
    try {
      await onToggleFavorite();
    } finally {
      setFavoriteBusy(false);
    }
  }

  return (
    <div ref={cardRef} className="clothing-card">
      <button
        className="clothing-card-open"
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
      <button
        className="favorite-button"
        data-favorite={item.favorite}
        type="button"
        disabled={favoriteBusy}
        aria-label={
          item.favorite
            ? `Remove ${item.name} from favorites`
            : `Add ${item.name} to favorites`
        }
        aria-pressed={item.favorite}
        onClick={() => void toggleFavorite()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7.5-4.7-9.6-9C.6 8.2 2.6 4 6.8 4c2.2 0 4 1.3 5.2 3 1.2-1.7 3-3 5.2-3 4.2 0 6.2 4.2 4.4 8-2.1 4.3-9.6 9-9.6 9Z" />
        </svg>
      </button>
    </div>
  );
});
