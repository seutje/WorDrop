import { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultOutfitSort,
  emptyOutfitFilters,
  filterOutfits,
  hasActiveOutfitFilters,
  sortOutfits,
  type OutfitFilters,
  type OutfitSort,
} from "../features/outfits/outfitFilters";
import { clothingRepository } from "../lib/database/clothingRepository";
import { outfitRepository } from "../lib/database/outfitRepository";
import { loadManagedImage } from "../lib/images/managedImages";
import { scoreOutfit } from "../lib/matching";
import { shouldExcludeBottoms } from "../lib/outfitRules";
import {
  clothingCategories,
  clothingColors,
  occasions,
  ownershipStates,
  seasons,
  type ClothingCategory,
  type ClothingItem,
} from "../types/clothing";
import type { Outfit } from "../types/outfit";

const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

function OutfitPreview({
  outfit,
  wardrobe,
}: {
  outfit: Outfit;
  wardrobe: ClothingItem[];
}) {
  const items = useMemo(
    () =>
      outfit.itemIds.flatMap((id) => {
        const item = wardrobe.find((entry) => entry.id === id);
        return item ? [item] : [];
      }),
    [outfit.itemIds, wardrobe],
  );
  const [images, setImages] = useState<Record<string, string>>({});
  const previewRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    if (shouldLoad || !previewRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [shouldLoad]);
  useEffect(() => {
    if (!shouldLoad) return;
    let active = true;
    Promise.all(
      items.slice(0, 4).map(async (item) => ({
        id: item.id,
        image: await loadManagedImage(item.displayImagePath ?? item.imagePath),
      })),
    )
      .then((loaded) => {
        if (active)
          setImages(
            Object.fromEntries(
              loaded.map(({ id, image }) => [id, image.dataUrl]),
            ),
          );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [items, outfit.id, shouldLoad]);
  return (
    <div ref={previewRef} className="outfit-preview" aria-hidden="true">
      {items
        .slice(0, 4)
        .map((item) =>
          images[item.id] ? (
            <img key={item.id} src={images[item.id]} alt="" />
          ) : (
            <span key={item.id}>{titleCase(item.category)}</span>
          ),
        )}
      {items.length === 0 && <span className="empty-preview">No items</span>}
    </div>
  );
}

function OutfitItemTile({
  item,
  onRemove,
  onReplace,
}: {
  item: ClothingItem;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    loadManagedImage(item.displayImagePath ?? item.imagePath)
      .then((image) => {
        if (active) setImageUrl(image.dataUrl);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [item.displayImagePath, item.imagePath]);
  return (
    <article className="outfit-item-tile">
      <div className="outfit-item-image">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} />
        ) : (
          <span className="image-loading">
            <span className="sr-only">Loading image</span>
          </span>
        )}
      </div>
      <div className="outfit-item-copy">
        <div>
          <small>{titleCase(item.category)}</small>
          <strong>{item.name}</strong>
        </div>
        <div>
          <button type="button" onClick={onReplace}>
            Replace
          </button>
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

function ItemPickerTile({
  item,
  onChoose,
}: {
  item: ClothingItem;
  onChoose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
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
  }, [item.displayImagePath, item.imagePath]);

  return (
    <button type="button" onClick={onChoose}>
      <span className="picker-item-image">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span
            className="picker-item-placeholder"
            data-loading={!missing}
            role={missing ? "img" : undefined}
            aria-label={missing ? "Image unavailable" : undefined}
          >
            {missing ? (
              "Image unavailable"
            ) : (
              <span className="sr-only">Loading image</span>
            )}
          </span>
        )}
      </span>
      <span className="picker-item-copy">
        <strong>{item.name}</strong>
        <small>{item.subtype || titleCase(item.category)}</small>
      </span>
    </button>
  );
}

function ItemPicker({
  items,
  excludedIds,
  excludeBottoms,
  onChoose,
  onClose,
}: {
  items: ClothingItem[];
  excludedIds: string[];
  excludeBottoms: boolean;
  onChoose: (item: ClothingItem) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ClothingCategory | "">("");
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          !excludedIds.includes(item.id) &&
          (!excludeBottoms || item.category !== "bottom") &&
          (!category || item.category === category) &&
          (!search.trim() ||
            item.name
              .toLocaleLowerCase()
              .includes(search.trim().toLocaleLowerCase())),
      ),
    [category, excludeBottoms, excludedIds, items, search],
  );
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="item-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-picker-heading"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Your closet</p>
            <h2 id="item-picker-heading">Choose an item</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close item picker"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="picker-filters">
          <label>
            <span className="sr-only">Search clothing</span>
            <input
              autoFocus
              type="search"
              placeholder="Search clothing…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter clothing category</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ClothingCategory | "")
              }
            >
              <option value="">All categories</option>
              {clothingCategories.map((value) => (
                <option value={value} key={value}>
                  {titleCase(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="picker-grid">
          {visible.map((item) => (
            <ItemPickerTile
              item={item}
              key={item.id}
              onChoose={() => onChoose(item)}
            />
          ))}
        </div>
        {visible.length === 0 && (
          <p className="recommendations-message">
            No available items match these filters.
          </p>
        )}
      </section>
    </div>
  );
}

type Props = {
  initialItemIds?: string[];
  initialOutfitId?: string;
  onDirtyChange: (dirty: boolean) => void;
  allowMultipleBottoms: boolean;
};

export function OutfitsPage({
  initialItemIds = [],
  initialOutfitId,
  onDirtyChange,
  allowMultipleBottoms,
}: Props) {
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"library" | "builder">(
    initialItemIds.length || initialOutfitId ? "builder" : "library",
  );
  const [activeOutfitId, setActiveOutfitId] = useState<string>();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialItemIds);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({ name: "", notes: "", selectedIds: initialItemIds }),
  );
  const [pickerIndex, setPickerIndex] = useState<number | null>();
  const [notice, setNotice] = useState<string | null>(
    initialItemIds.length ? "Started an outfit from your selection." : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<string[]>([]);
  const [libraryFilters, setLibraryFilters] =
    useState<OutfitFilters>(emptyOutfitFilters);
  const [librarySort, setLibrarySort] = useState<OutfitSort>(defaultOutfitSort);
  const snapshot = JSON.stringify({ name, notes, selectedIds });
  const dirty = snapshot !== savedSnapshot;
  const selectedItems = selectedIds.flatMap((id) => {
    const item = wardrobe.find((entry) => entry.id === id);
    return item ? [item] : [];
  });
  const compatibility = scoreOutfit(selectedItems);
  const visibleOutfits = useMemo(
    () =>
      sortOutfits(
        filterOutfits(outfits, wardrobe, libraryFilters),
        librarySort,
      ),
    [libraryFilters, librarySort, outfits, wardrobe],
  );
  const libraryFiltersActive = hasActiveOutfitFilters(libraryFilters);

  useEffect(() => {
    let active = true;
    Promise.all([clothingRepository.list(), outfitRepository.list()])
      .then(([items, saved]) => {
        if (!active) return;
        setWardrobe(items);
        setOutfits(saved);
        if (initialOutfitId) {
          const requested = saved.find(
            (outfit) => outfit.id === initialOutfitId,
          );
          if (requested) openOutfitValues(requested);
          else {
            setView("library");
            setError("That saved outfit could not be found.");
          }
        }
      })
      .catch(() => {
        if (active)
          setError(
            "The outfit builder could not load your saved data. Nothing was changed.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialOutfitId]);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function confirmDiscard() {
    return !dirty || window.confirm("Discard your unsaved outfit changes?");
  }
  function openOutfitValues(outfit: Outfit) {
    setActiveOutfitId(outfit.id);
    setSelectedIds(outfit.itemIds);
    setName(outfit.name);
    setNotes(outfit.notes ?? "");
    setSavedSnapshot(
      JSON.stringify({
        name: outfit.name,
        notes: outfit.notes ?? "",
        selectedIds: outfit.itemIds,
      }),
    );
    setView("builder");
    setNotice(null);
  }
  function resetBuilder() {
    if (!confirmDiscard()) return;
    setActiveOutfitId(undefined);
    setSelectedIds([]);
    setName("");
    setNotes("");
    setSavedSnapshot(JSON.stringify({ name: "", notes: "", selectedIds: [] }));
    setNotice(null);
    setView("builder");
  }
  function openOutfit(outfit: Outfit) {
    if (!confirmDiscard()) return;
    openOutfitValues(outfit);
  }
  function showLibrary() {
    if (!confirmDiscard()) return;
    setView("library");
    setNotice(null);
  }
  function chooseItem(item: ClothingItem) {
    setSelectedIds((current) => {
      if (pickerIndex === null || pickerIndex === undefined)
        return [...current, item.id];
      return current.map((id, index) => (index === pickerIndex ? item.id : id));
    });
    setPickerIndex(undefined);
  }

  async function save() {
    if (!name.trim()) {
      setError("Enter a name before saving the outfit.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const values = {
        name: name.trim(),
        notes: notes.trim() || undefined,
        itemIds: selectedIds,
        favorite:
          outfits.find((outfit) => outfit.id === activeOutfitId)?.favorite ??
          false,
      };
      const saved = activeOutfitId
        ? await outfitRepository.update(activeOutfitId, {
            ...values,
            id: activeOutfitId,
          })
        : await outfitRepository.create(values);
      setActiveOutfitId(saved.id);
      setName(saved.name);
      setNotes(saved.notes ?? "");
      setSelectedIds(saved.itemIds);
      setSavedSnapshot(
        JSON.stringify({
          name: saved.name,
          notes: saved.notes ?? "",
          selectedIds: saved.itemIds,
        }),
      );
      setOutfits(await outfitRepository.list());
      setNotice("Outfit saved.");
    } catch {
      setError(
        "The outfit could not be saved. Your selections are still here. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function duplicate() {
    if (!activeOutfitId) return;
    setSaving(true);
    setError(null);
    try {
      const copy = await outfitRepository.create({
        name: `${name} copy`,
        notes: notes.trim() || undefined,
        itemIds: selectedIds,
      });
      setActiveOutfitId(copy.id);
      setName(copy.name);
      setSavedSnapshot(
        JSON.stringify({
          name: copy.name,
          notes: copy.notes ?? "",
          selectedIds: copy.itemIds,
        }),
      );
      setOutfits(await outfitRepository.list());
      setNotice("Outfit duplicated.");
    } catch {
      setError("The outfit could not be duplicated. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function renameOutfit(outfit: Outfit) {
    const nextName = window.prompt("Rename outfit", outfit.name)?.trim();
    if (!nextName || nextName === outfit.name) return;
    setError(null);
    try {
      const renamed = await outfitRepository.update(outfit.id, {
        ...outfit,
        name: nextName,
      });
      setOutfits((current) =>
        current.map((entry) => (entry.id === renamed.id ? renamed : entry)),
      );
      setNotice("Outfit renamed.");
    } catch {
      setError("The outfit could not be renamed. Nothing was changed.");
    }
  }

  async function deleteOutfit(outfit: Outfit) {
    if (
      !window.confirm(`Delete “${outfit.name}”? Clothing items will be kept.`)
    )
      return;
    setError(null);
    try {
      await outfitRepository.delete(outfit.id);
      setOutfits((current) =>
        current.filter((entry) => entry.id !== outfit.id),
      );
      setNotice("Outfit deleted. Your clothing items were kept.");
    } catch {
      setError("The outfit could not be deleted. Nothing was changed.");
    }
  }

  async function toggleFavorite(outfit: Outfit) {
    const favorite = !outfit.favorite;
    setError(null);
    setFavoriteBusyIds((current) => [...current, outfit.id]);
    setOutfits((current) =>
      current.map((entry) =>
        entry.id === outfit.id ? { ...entry, favorite } : entry,
      ),
    );
    try {
      const updated = await outfitRepository.setFavorite(outfit.id, favorite);
      setOutfits((current) =>
        current.map((entry) => (entry.id === outfit.id ? updated : entry)),
      );
    } catch {
      setOutfits((current) =>
        current.map((entry) =>
          entry.id === outfit.id
            ? { ...entry, favorite: outfit.favorite }
            : entry,
        ),
      );
      setError(
        "The outfit favorite could not be updated. Nothing else was changed.",
      );
    } finally {
      setFavoriteBusyIds((current) => current.filter((id) => id !== outfit.id));
    }
  }

  if (view === "library")
    return (
      <section
        className="page saved-outfits-page"
        aria-labelledby="outfits-heading"
      >
        <header className="page-header">
          <div>
            <p className="eyebrow">Your looks</p>
            <h1 id="outfits-heading">Saved Outfits</h1>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={resetBuilder}
          >
            + Create outfit
          </button>
        </header>
        {notice && (
          <p className="success-banner" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        {loading && <p className="loading-message">Opening your outfits…</p>}
        {!loading && outfits.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              ◇
            </div>
            <h2>Save your first look</h2>
            <p>
              Combine clothing from your closet into an outfit you can revisit.
            </p>
            <button
              className="secondary-button empty-action"
              type="button"
              onClick={resetBuilder}
            >
              Create an outfit
            </button>
          </div>
        )}
        {!loading && outfits.length > 0 && (
          <>
            <div className="closet-controls">
              <label className="search-control">
                <span className="sr-only">Search saved outfits</span>
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Search your outfits…"
                  value={libraryFilters.search}
                  onChange={(event) =>
                    setLibraryFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="filter-row" aria-label="Outfit filters">
                <label>
                  <span className="sr-only">Category</span>
                  <select
                    value={libraryFilters.category}
                    onChange={(event) =>
                      setLibraryFilters((current) => ({
                        ...current,
                        category: event.target
                          .value as OutfitFilters["category"],
                      }))
                    }
                  >
                    <option value="">All categories</option>
                    {clothingCategories.map((value) => (
                      <option value={value} key={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Ownership</span>
                  <select
                    value={libraryFilters.ownership}
                    onChange={(event) =>
                      setLibraryFilters((current) => ({
                        ...current,
                        ownership: event.target
                          .value as OutfitFilters["ownership"],
                      }))
                    }
                  >
                    <option value="">Owned & wishlist</option>
                    {ownershipStates.map((value) => (
                      <option value={value} key={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Color</span>
                  <select
                    value={libraryFilters.color}
                    onChange={(event) =>
                      setLibraryFilters((current) => ({
                        ...current,
                        color: event.target.value as OutfitFilters["color"],
                      }))
                    }
                  >
                    <option value="">All colors</option>
                    {clothingColors.map((value) => (
                      <option value={value} key={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Season</span>
                  <select
                    value={libraryFilters.season}
                    onChange={(event) =>
                      setLibraryFilters((current) => ({
                        ...current,
                        season: event.target.value as OutfitFilters["season"],
                      }))
                    }
                  >
                    <option value="">All seasons</option>
                    {seasons.map((value) => (
                      <option value={value} key={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Occasion</span>
                  <select
                    value={libraryFilters.occasion}
                    onChange={(event) =>
                      setLibraryFilters((current) => ({
                        ...current,
                        occasion: event.target
                          .value as OutfitFilters["occasion"],
                      }))
                    }
                  >
                    <option value="">All occasions</option>
                    {occasions.map((value) => (
                      <option value={value} key={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Sort outfits</span>
                  <select
                    aria-label="Sort outfits"
                    value={librarySort}
                    onChange={(event) =>
                      setLibrarySort(event.target.value as OutfitSort)
                    }
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="favorite">Favorite</option>
                  </select>
                </label>
                {libraryFiltersActive && (
                  <button
                    className="clear-filters"
                    type="button"
                    onClick={() => setLibraryFilters(emptyOutfitFilters)}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            <div className="closet-results-heading">
              <p>
                {visibleOutfits.length}{" "}
                {visibleOutfits.length === 1 ? "outfit" : "outfits"}
              </p>
            </div>
            {visibleOutfits.length > 0 ? (
              <div className="outfit-library-grid" aria-label="Saved outfits">
                {visibleOutfits.map((outfit) => (
                  <article className="outfit-library-card" key={outfit.id}>
                    <button
                      className="outfit-card-open"
                      type="button"
                      aria-label={`Open ${outfit.name}`}
                      onClick={() => openOutfit(outfit)}
                    >
                      <OutfitPreview outfit={outfit} wardrobe={wardrobe} />
                      <span className="outfit-card-copy">
                        <strong>{outfit.name}</strong>
                        <small>
                          {outfit.itemIds.length}{" "}
                          {outfit.itemIds.length === 1 ? "item" : "items"}
                        </small>
                        {outfit.notes && <span>{outfit.notes}</span>}
                      </span>
                    </button>
                    <button
                      className="favorite-button"
                      data-favorite={outfit.favorite}
                      type="button"
                      disabled={favoriteBusyIds.includes(outfit.id)}
                      aria-label={
                        outfit.favorite
                          ? `Remove ${outfit.name} from favorites`
                          : `Add ${outfit.name} to favorites`
                      }
                      aria-pressed={outfit.favorite}
                      onClick={() => void toggleFavorite(outfit)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 21s-7.5-4.7-9.6-9C.6 8.2 2.6 4 6.8 4c2.2 0 4 1.3 5.2 3 1.2-1.7 3-3 5.2-3 4.2 0 6.2 4.2 4.4 8-2.1 4.3-9.6 9-9.6 9Z" />
                      </svg>
                    </button>
                    <div className="outfit-card-actions">
                      <button
                        type="button"
                        onClick={() => void renameOutfit(outfit)}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteOutfit(outfit)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <h2>No matching outfits</h2>
                <p>Try a different search or clear your filters.</p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setLibraryFilters(emptyOutfitFilters)}
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </section>
    );

  return (
    <section className="page outfit-builder" aria-labelledby="outfits-heading">
      <header className="page-header">
        <div>
          <p className="eyebrow">Plan a look</p>
          <h1 id="outfits-heading">Outfit Builder</h1>
        </div>
        <div className="action-group">
          <button
            className="secondary-button"
            type="button"
            onClick={showLibrary}
          >
            All outfits
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={resetBuilder}
          >
            New outfit
          </button>
          {activeOutfitId && (
            <button
              className="secondary-button"
              type="button"
              disabled={saving}
              onClick={duplicate}
            >
              Duplicate
            </button>
          )}
          <button
            className="primary-button"
            type="button"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Saving…" : "Save outfit"}
          </button>
        </div>
      </header>
      {notice && (
        <p className="success-banner" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="outfit-builder-layout">
        <aside className="saved-outfits-rail">
          <h2>Saved outfits</h2>
          {outfits.length ? (
            outfits.map((outfit) => (
              <button
                type="button"
                data-active={outfit.id === activeOutfitId}
                key={outfit.id}
                onClick={() => openOutfit(outfit)}
              >
                <strong>{outfit.name}</strong>
                <small>
                  {outfit.itemIds.length}{" "}
                  {outfit.itemIds.length === 1 ? "item" : "items"}
                </small>
              </button>
            ))
          ) : (
            <p>No saved outfits yet.</p>
          )}
        </aside>
        <div className="outfit-workspace">
          <div className="outfit-fields">
            <label>
              <span>Outfit name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Weekend casual"
              />
            </label>
            <label>
              <span>Notes</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional styling notes…"
              />
            </label>
          </div>
          <section className="outfit-compatibility" aria-live="polite">
            <div className="compatibility-heading">
              <div>
                <p className="eyebrow">Compatibility guide</p>
                <h2>
                  {compatibility.status === "scored"
                    ? compatibility.label
                    : "Add a little more"}
                </h2>
              </div>
              {compatibility.status === "scored" && (
                <strong
                  aria-label={`Compatibility score ${compatibility.score} out of 100`}
                >
                  {compatibility.score}
                  <small>/100</small>
                </strong>
              )}
            </div>
            {compatibility.status === "insufficient" ? (
              <p>{compatibility.message}</p>
            ) : (
              <>
                <p>{compatibility.summary}</p>
                <ul>
                  {compatibility.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </>
            )}
            <small className="compatibility-note">
              A style suggestion, not a rule. You can always save this outfit.
            </small>
          </section>
          <div className="outfit-board">
            {selectedItems.map((item, index) => (
              <OutfitItemTile
                item={item}
                key={`${item.id}-${index}`}
                onRemove={() =>
                  setSelectedIds((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                onReplace={() => setPickerIndex(index)}
              />
            ))}
            <button
              className="add-outfit-item"
              type="button"
              onClick={() => setPickerIndex(null)}
            >
              <span>+</span>Add clothing
            </button>
          </div>
          {selectedItems.length === 0 && (
            <p className="builder-guidance">
              Start anywhere. Incomplete and unusual outfits are welcome.
            </p>
          )}
        </div>
      </div>
      {pickerIndex !== undefined && (
        <ItemPicker
          items={wardrobe}
          excludedIds={selectedIds.filter((_, index) => index !== pickerIndex)}
          excludeBottoms={shouldExcludeBottoms(
            selectedItems,
            pickerIndex,
            allowMultipleBottoms,
          )}
          onChoose={chooseItem}
          onClose={() => setPickerIndex(undefined)}
        />
      )}
    </section>
  );
}
