import { useEffect, useState, type ReactNode } from "react";
import { clothingRepository } from "../../lib/database/clothingRepository";
import { loadManagedImage } from "../../lib/images/managedImages";
import type { ClothingItem } from "../../types/clothing";

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
};

export function ClothingDetail({ itemId, onBack, onEdit, onDeleted }: Props) {
  const [item, setItem] = useState<ClothingItem | null>();
  const [imageUrl, setImageUrl] = useState<string>();
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      {notice && (
        <p className="success-banner" role="status">
          {notice}
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
              onClick={() =>
                setNotice(
                  "The visual outfit builder arrives in Phase 9. This item will be ready to use there.",
                )
              }
            >
              Build outfit from this item
            </button>
          </div>
        </div>
      </div>
      <div className="detail-sections">
        <section className="detail-panel">
          <div>
            <p className="eyebrow">Coming in Phase 7</p>
            <h2>Looks good with</h2>
          </div>
          <p>
            The recommendation engine is ready. Ranked matching items and
            explanations will appear here when the recommendation UI is added.
          </p>
        </section>
        <section className="detail-panel">
          <div>
            <p className="eyebrow">Coming in Phase 8</p>
            <h2>Saved outfits</h2>
          </div>
          <p>
            Outfits containing this item will appear here once saved outfits are
            available.
          </p>
        </section>
      </div>
    </section>
  );
}
