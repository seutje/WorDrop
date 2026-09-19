import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clothingRepository } from "../../lib/database/clothingRepository";
import { outfitRepository } from "../../lib/database/outfitRepository";
import { loadManagedImage } from "../../lib/images/managedImages";
import { rankMatches } from "../../lib/matching";
import type { ClothingItem } from "../../types/clothing";
import type { Outfit } from "../../types/outfit";
import { RecommendationCard } from "./RecommendationCard";

const titleCase = (value: string) =>
  value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
function MetadataRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
function TagList({ values }: { values: readonly string[] }) {
  return (
    <span className="detail-tags">
      {values.map((value) => (
        <span key={value}>{titleCase(value)}</span>
      ))}
    </span>
  );
}

type Props = {
  itemId: string;
  onBack: () => void;
  onEdit: (item: ClothingItem) => void;
  onDeleted: (message: string) => void;
  onInspectItem: (itemId: string) => void;
  onStartOutfit: (itemIds: string[]) => void;
  onOpenOutfit: (outfitId: string) => void;
};

export function ClothingDetail({
  itemId,
  onBack,
  onEdit,
  onDeleted,
  onInspectItem,
  onStartOutfit,
  onOpenOutfit,
}: Props) {
  const [item, setItem] = useState<ClothingItem | null>();
  const [candidates, setCandidates] = useState<ClothingItem[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState(false);
  const [includeWishlist, setIncludeWishlist] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>();
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [relatedOutfits, setRelatedOutfits] = useState<Outfit[]>([]);
  const [relatedOutfitsLoading, setRelatedOutfitsLoading] = useState(true);
  const [relatedOutfitsError, setRelatedOutfitsError] = useState(false);
  const recommendations = useMemo(() => {
    if (!item) return [];
    const allowed = includeWishlist
      ? candidates
      : candidates.filter((candidate) => candidate.ownership === "owned");
    const byId = new Map(allowed.map((candidate) => [candidate.id, candidate]));
    return rankMatches(item, allowed)
      .slice(0, 8)
      .flatMap((result) => {
        const candidate = byId.get(result.itemId);
        return candidate ? [{ item: candidate, result }] : [];
      });
  }, [candidates, includeWishlist, item]);

  useEffect(() => {
    let active = true;
    outfitRepository
      .containingItem(itemId)
      .then((outfits) => {
        if (active) setRelatedOutfits(outfits);
      })
      .catch(() => {
        if (active) setRelatedOutfitsError(true);
      })
      .finally(() => {
        if (active) setRelatedOutfitsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [itemId]);

  useEffect(() => {
    let active = true;
    clothingRepository
      .get(itemId)
      .then((loadedItem) => {
        if (active) setItem(loadedItem);
      })
      .catch(() => {
        if (active)
          setError(
            "This clothing item could not be loaded. Your saved data was not changed.",
          );
      });
    return () => {
      active = false;
    };
  }, [itemId]);

  useEffect(() => {
    let active = true;
    clothingRepository
      .list()
      .then((loadedItems) => {
        if (active) setCandidates(loadedItems);
      })
      .catch(() => {
        if (active) setRecommendationsError(true);
      })
      .finally(() => {
        if (active) setRecommendationsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [itemId]);

  useEffect(() => {
    if (!item) return;
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
  }, [item]);

  async function deleteItem() {
    if (
      !item ||
      !window.confirm(`Delete “${item.name}”? This cannot be undone.`)
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      const deleted = await clothingRepository.delete(item.id);
      if (!deleted) {
        setItem(null);
        return;
      }
      onDeleted("Item deleted.");
    } catch {
      setError(
        "The item could not be deleted. Nothing was changed. Try again.",
      );
      setDeleting(false);
    }
  }

  if (error && item === undefined)
    return (
      <section className="detail-message" role="alert">
        <h1>Item unavailable</h1>
        <p>{error}</p>
        <button className="secondary-button" type="button" onClick={onBack}>
          Back to Closet
        </button>
      </section>
    );
  if (item === undefined)
    return <p className="loading-message">Opening item…</p>;
  if (item === null)
    return (
      <section className="detail-message">
        <h1>Item not found</h1>
        <p>It may have been deleted from your closet.</p>
        <button className="secondary-button" type="button" onClick={onBack}>
          Back to Closet
        </button>
      </section>
    );

  return (
    <section
      className="clothing-detail"
      aria-labelledby="clothing-detail-heading"
    >
      <button className="back-button" type="button" onClick={onBack}>
        ← Back to Closet
      </button>
      {error && (
        <p className="error-message detail-alert" role="alert">
          {error}
        </p>
      )}
      <div className="detail-hero">
        <div className="detail-image">
          {imageUrl ? (
            <img src={imageUrl} alt={item.name} />
          ) : (
            <span>{imageError ? "Image unavailable" : "Loading image…"}</span>
          )}
        </div>
        <div className="detail-copy">
          <p
            className="ownership-label"
            data-wishlist={item.ownership === "wishlist"}
          >
            {item.ownership === "wishlist" ? "♥ Wishlist" : "● Owned"}
          </p>
          <h1 id="clothing-detail-heading">{item.name}</h1>
          <dl className="detail-metadata">
            <MetadataRow label="Category">
              {titleCase(item.category)}
            </MetadataRow>
            {item.subtype && (
              <MetadataRow label="Subtype">{item.subtype}</MetadataRow>
            )}
            {item.colors.length > 0 && (
              <MetadataRow label="Colors">
                <TagList values={item.colors} />
              </MetadataRow>
            )}
            {item.material && (
              <MetadataRow label="Material">{item.material}</MetadataRow>
            )}
            {item.pattern && (
              <MetadataRow label="Pattern">{item.pattern}</MetadataRow>
            )}
            {item.seasons.length > 0 && (
              <MetadataRow label="Seasons">
                <TagList values={item.seasons} />
              </MetadataRow>
            )}
            {item.occasions.length > 0 && (
              <MetadataRow label="Occasions">
                <TagList values={item.occasions} />
              </MetadataRow>
            )}
            {item.styleTags.length > 0 && (
              <MetadataRow label="Style">
                <TagList values={item.styleTags} />
              </MetadataRow>
            )}
            {item.notes && (
              <MetadataRow label="Notes">
                <span className="detail-notes">{item.notes}</span>
              </MetadataRow>
            )}
          </dl>
          <div className="detail-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => onEdit(item)}
            >
              Edit
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={deleting}
              onClick={deleteItem}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => onStartOutfit([item.id])}
            >
              Build outfit from this item
            </button>
          </div>
        </div>
      </div>
      <div className="detail-sections">
        <section className="detail-panel recommendations-panel">
          <div className="recommendations-heading">
            <div>
              <p className="eyebrow">Wardrobe matches</p>
              <h2>Looks good with</h2>
            </div>
            <label className="wishlist-toggle">
              <input
                type="checkbox"
                checked={includeWishlist}
                onChange={(event) => setIncludeWishlist(event.target.checked)}
              />
              Include wishlist
            </label>
          </div>
          {recommendationsLoading && (
            <p className="recommendations-message">Finding compatible items…</p>
          )}
          {recommendationsError && (
            <p className="recommendations-message error-message">
              Suggestions could not be loaded. Your wardrobe data was not
              changed.
            </p>
          )}
          {!recommendationsLoading &&
            !recommendationsError &&
            recommendations.length === 0 && (
              <p className="recommendations-message">
                No {includeWishlist ? "other" : "owned"} items are available to
                suggest yet.
              </p>
            )}
          {recommendations.length > 0 && (
            <div className="recommendations-grid">
              {recommendations.map(({ item: candidate, result }) => (
                <RecommendationCard
                  key={candidate.id}
                  item={candidate}
                  result={result}
                  onInspect={() => onInspectItem(candidate.id)}
                  onStartOutfit={() => onStartOutfit([item.id, candidate.id])}
                />
              ))}
            </div>
          )}
        </section>
        <section className="detail-panel related-outfits-panel">
          <div>
            <p className="eyebrow">Worn together</p>
            <h2>Saved outfits</h2>
          </div>
          {relatedOutfitsLoading && <p>Finding saved outfits…</p>}
          {relatedOutfitsError && (
            <p className="error-message">Saved outfits could not be loaded.</p>
          )}
          {!relatedOutfitsLoading &&
            !relatedOutfitsError &&
            relatedOutfits.length === 0 && (
              <p>This item is not part of a saved outfit yet.</p>
            )}
          {relatedOutfits.length > 0 && (
            <div className="related-outfits-list">
              {relatedOutfits.map((outfit) => (
                <button
                  key={outfit.id}
                  type="button"
                  onClick={() => onOpenOutfit(outfit.id)}
                >
                  <strong>{outfit.name}</strong>
                  <span>
                    {outfit.itemIds.length}{" "}
                    {outfit.itemIds.length === 1 ? "item" : "items"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
