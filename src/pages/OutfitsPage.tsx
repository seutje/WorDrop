import { useEffect, useMemo, useState } from "react";
import { clothingRepository } from "../lib/database/clothingRepository";
import { outfitRepository } from "../lib/database/outfitRepository";
import { loadManagedImage } from "../lib/images/managedImages";
import {
  clothingCategories,
  type ClothingCategory,
  type ClothingItem,
} from "../types/clothing";
import type { Outfit } from "../types/outfit";

const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

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
    loadManagedImage(item.imagePath)
      .then((image) => {
        if (active) setImageUrl(image.dataUrl);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [item.imagePath]);
  return (
    <article className="outfit-item-tile">
      <div className="outfit-item-image">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} />
        ) : (
          <span>Loading…</span>
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

function ItemPicker({
  items,
  excludedIds,
  onChoose,
  onClose,
}: {
  items: ClothingItem[];
  excludedIds: string[];
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
          (!category || item.category === category) &&
          (!search.trim() ||
            item.name
              .toLocaleLowerCase()
              .includes(search.trim().toLocaleLowerCase())),
      ),
    [category, excludedIds, items, search],
  );
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="item-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-picker-heading"
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
            <button type="button" key={item.id} onClick={() => onChoose(item)}>
              <span>{item.name}</span>
              <small>{item.subtype || titleCase(item.category)}</small>
            </button>
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
  onDirtyChange: (dirty: boolean) => void;
};

export function OutfitsPage({ initialItemIds = [], onDirtyChange }: Props) {
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
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
  const snapshot = JSON.stringify({ name, notes, selectedIds });
  const dirty = snapshot !== savedSnapshot;
  const selectedItems = selectedIds.flatMap((id) => {
    const item = wardrobe.find((entry) => entry.id === id);
    return item ? [item] : [];
  });

  useEffect(() => {
    let active = true;
    Promise.all([clothingRepository.list(), outfitRepository.list()])
      .then(([items, saved]) => {
        if (!active) return;
        setWardrobe(items);
        setOutfits(saved);
      })
      .catch(() => {
        if (active)
          setError(
            "The outfit builder could not load your saved data. Nothing was changed.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
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
  function resetBuilder() {
    if (!confirmDiscard()) return;
    setActiveOutfitId(undefined);
    setSelectedIds([]);
    setName("");
    setNotes("");
    setSavedSnapshot(JSON.stringify({ name: "", notes: "", selectedIds: [] }));
    setNotice(null);
  }
  function openOutfit(outfit: Outfit) {
    if (!confirmDiscard()) return;
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
          onChoose={chooseItem}
          onClose={() => setPickerIndex(undefined)}
        />
      )}
    </section>
  );
}
