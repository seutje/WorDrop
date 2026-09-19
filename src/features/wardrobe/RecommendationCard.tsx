import { useEffect, useState } from "react";
import { loadManagedImage } from "../../lib/images/managedImages";
import type { MatchResult } from "../../lib/matching";
import type { ClothingItem } from "../../types/clothing";

function matchLabel(score: number) {
  if (score >= 85) return "Great match";
  if (score >= 70) return "Good match";
  if (score >= 55) return "Worth trying";
  return "Lower-confidence match";
}

export function RecommendationCard({
  item,
  result,
  onInspect,
  onStartOutfit,
}: {
  item: ClothingItem;
  result: MatchResult;
  onInspect: () => void;
  onStartOutfit: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [imageMissing, setImageMissing] = useState(false);
  useEffect(() => {
    let active = true;
    loadManagedImage(item.imagePath)
      .then((image) => {
        if (active) setImageUrl(image.dataUrl);
      })
      .catch(() => {
        if (active) setImageMissing(true);
      });
    return () => {
      active = false;
    };
  }, [item.imagePath]);
  return (
    <article className="recommendation-card">
      <button
        className="recommendation-main"
        type="button"
        onClick={onInspect}
        aria-label={`Inspect recommendation ${item.name}`}
      >
        <span className="recommendation-image">
          {imageUrl ? (
            <img src={imageUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className={imageMissing ? undefined : "image-loading"}>
              {imageMissing ? (
                "Image unavailable"
              ) : (
                <span className="sr-only">Loading image</span>
              )}
            </span>
          )}
          <strong>{result.score}%</strong>
        </span>
        <span className="recommendation-copy">
          <b>{item.name}</b>
          <small>{matchLabel(result.score)}</small>
          <span>{result.reasons.join(" ")}</span>
        </span>
      </button>
      <button
        className="recommendation-action"
        type="button"
        onClick={onStartOutfit}
      >
        Start outfit
      </button>
    </article>
  );
}
