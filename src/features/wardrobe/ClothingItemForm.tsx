import { useEffect, useState, type FormEvent } from "react";
import { clothingRepository } from "../../lib/database/clothingRepository";
import {
  chooseAndImportImage,
  discardManagedImage,
  loadManagedImage,
  type ManagedImage,
} from "../../lib/images/managedImages";
import {
  clothingCategories,
  clothingColors,
  occasions,
  seasons,
  type ClothingCategory,
  type ClothingColor,
  type ClothingItem,
  type Occasion,
  type Ownership,
  type Season,
} from "../../types/clothing";

type Props = {
  item?: ClothingItem;
  onCancel: () => void;
  onSaved: (message: string) => void;
};
const titleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
const errorMessage = (error: unknown) =>
  typeof error === "string"
    ? error
    : "The item could not be saved. Your photo was not deleted. Try again.";

function ToggleGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  selected: readonly T[];
  onChange: (values: T[]) => void;
}) {
  const toggle = (value: T) =>
    onChange(
      selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value],
    );
  return (
    <fieldset className="form-field form-field-wide toggle-fieldset">
      <legend>{label}</legend>
      <div className="toggle-options">
        {options.map((option) => (
          <label
            className="toggle-chip"
            data-selected={selected.includes(option)}
            key={option}
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
            />
            {titleCase(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ClothingItemForm({ item, onCancel, onSaved }: Props) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<ClothingCategory>(
    item?.category ?? "top",
  );
  const [subtype, setSubtype] = useState(item?.subtype ?? "");
  const [colors, setColors] = useState<ClothingColor[]>(item?.colors ?? []);
  const [material, setMaterial] = useState(item?.material ?? "");
  const [pattern, setPattern] = useState(item?.pattern ?? "");
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>(
    item?.seasons ?? [],
  );
  const [selectedOccasions, setSelectedOccasions] = useState<Occasion[]>(
    item?.occasions ?? [],
  );
  const [styleTags, setStyleTags] = useState(item?.styleTags.join(", ") ?? "");
  const [ownership, setOwnership] = useState<Ownership>(
    item?.ownership ?? "owned",
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [image, setImage] = useState<ManagedImage | null>(null);
  const [pendingImageReference, setPendingImageReference] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    let active = true;
    loadManagedImage(item.imagePath)
      .then((loaded) => {
        if (active) setImage(loaded);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [item]);

  async function chooseImage() {
    setBusy(true);
    setError(null);
    try {
      const imported = await chooseAndImportImage();
      if (!imported) return;
      const previousPending = pendingImageReference;
      setImage(imported);
      setPendingImageReference(imported.reference);
      if (previousPending) await discardManagedImage(previousPending);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (pendingImageReference)
      await discardManagedImage(pendingImageReference).catch(() => undefined);
    onCancel();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter a name for the clothing item.");
      return;
    }
    if (!image) {
      setError("Choose a photo for the clothing item.");
      return;
    }
    setBusy(true);
    const values = {
      name: name.trim(),
      category,
      subtype: subtype.trim() || undefined,
      colors,
      material: material.trim() || undefined,
      pattern: pattern.trim() || undefined,
      seasons: selectedSeasons,
      occasions: selectedOccasions,
      styleTags: [
        ...new Set(
          styleTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ],
      ownership,
      imagePath: image.reference,
      notes: notes.trim() || undefined,
    };
    try {
      if (item)
        await clothingRepository.update(item.id, { ...values, id: item.id });
      else await clothingRepository.create(values);
      setPendingImageReference(null);
      onSaved(item ? "Item updated." : "Item added to your closet.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    if (
      !item ||
      !window.confirm(`Delete “${item.name}”? This cannot be undone.`)
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await clothingRepository.delete(item.id);
      if (pendingImageReference)
        await discardManagedImage(pendingImageReference);
      onSaved("Item deleted.");
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="item-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-form-title"
      >
        <form onSubmit={submit}>
          <div className="dialog-heading sticky-heading">
            <div>
              <p className="eyebrow">
                {item ? "Edit wardrobe" : "New wardrobe item"}
              </p>
              <h2 id="item-form-title">{item ? "Edit item" : "Add item"}</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close"
              onClick={cancel}
            >
              ×
            </button>
          </div>
          <div className="item-form-layout">
            <div className="form-photo-column">
              <div
                className="image-preview form-image-preview"
                data-empty={!image}
              >
                {image ? (
                  <img src={image.dataUrl} alt="Clothing preview" />
                ) : (
                  <div>
                    <span aria-hidden="true">◇</span>
                    <p>JPEG, PNG, or WebP</p>
                  </div>
                )}
              </div>
              <button
                className="secondary-button full-button"
                type="button"
                disabled={busy}
                onClick={chooseImage}
              >
                {image ? "Replace photo" : "Choose photo"}
              </button>
              <p className="field-help">
                The app keeps a private copy and never changes your original.
              </p>
            </div>
            <div className="form-fields">
              <label className="form-field form-field-wide">
                <span>
                  Name <b aria-hidden="true">*</b>
                </span>
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Black oversized T-shirt"
                />
              </label>
              <label className="form-field">
                <span>
                  Category <b aria-hidden="true">*</b>
                </span>
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as ClothingCategory)
                  }
                >
                  {clothingCategories.map((value) => (
                    <option key={value} value={value}>
                      {titleCase(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Subtype</span>
                <input
                  value={subtype}
                  onChange={(event) => setSubtype(event.target.value)}
                  placeholder="T-shirt"
                />
              </label>
              <label className="form-field">
                <span>Material</span>
                <input
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  placeholder="Cotton"
                />
              </label>
              <label className="form-field">
                <span>Pattern</span>
                <input
                  value={pattern}
                  onChange={(event) => setPattern(event.target.value)}
                  placeholder="Solid"
                />
              </label>
              <ToggleGroup
                label="Colors"
                options={clothingColors}
                selected={colors}
                onChange={setColors}
              />
              <ToggleGroup
                label="Seasons"
                options={seasons}
                selected={selectedSeasons}
                onChange={setSelectedSeasons}
              />
              <ToggleGroup
                label="Occasions"
                options={occasions}
                selected={selectedOccasions}
                onChange={setSelectedOccasions}
              />
              <label className="form-field form-field-wide">
                <span>Style tags</span>
                <input
                  value={styleTags}
                  onChange={(event) => setStyleTags(event.target.value)}
                  placeholder="Minimalist, casual, classic"
                />
                <small>Separate tags with commas.</small>
              </label>
              <fieldset className="form-field form-field-wide ownership-field">
                <legend>
                  Wardrobe status <b aria-hidden="true">*</b>
                </legend>
                <div className="segmented-control">
                  <label data-selected={ownership === "owned"}>
                    <input
                      type="radio"
                      name="ownership"
                      checked={ownership === "owned"}
                      onChange={() => setOwnership("owned")}
                    />
                    Owned
                  </label>
                  <label data-selected={ownership === "wishlist"}>
                    <input
                      type="radio"
                      name="ownership"
                      checked={ownership === "wishlist"}
                      onChange={() => setOwnership("wishlist")}
                    />
                    Wishlist
                  </label>
                </div>
              </fieldset>
              <label className="form-field form-field-wide">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Fit, care, or styling notes…"
                />
              </label>
            </div>
          </div>
          {error && (
            <p className="error-message form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions form-actions">
            <div>
              {item && (
                <button
                  className="danger-button"
                  type="button"
                  disabled={busy}
                  onClick={deleteItem}
                >
                  Delete item
                </button>
              )}
            </div>
            <div className="action-group">
              <button
                className="secondary-button"
                type="button"
                disabled={busy}
                onClick={cancel}
              >
                Cancel
              </button>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? "Saving…" : item ? "Save changes" : "Add item"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
