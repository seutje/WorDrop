import { useEffect, useRef, useState, type FormEvent } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { clothingRepository } from "../../lib/database/clothingRepository";
import {
  chooseAndImportImage,
  discardManagedImage,
  importImageFromPath,
  loadManagedImage,
  saveDisplayImage,
  type ManagedImage,
} from "../../lib/images/managedImages";
import { renderDisplayImage } from "../../lib/images/imageFraming";
import {
  canApplyCategorySuggestion,
  canApplySubtypeSuggestion,
  classifyManagedImage,
  type ImageClassificationResult,
} from "../../lib/images/imageClassification";
import { ImageCropEditor } from "./ImageCropEditor";
import { WebsiteImagePicker } from "./WebsiteImagePicker";
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
  const [size, setSize] = useState(item?.size ?? "");
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
  const [sourceUrl, setSourceUrl] = useState(item?.sourceUrl ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [image, setImage] = useState<ManagedImage | null>(null);
  const [pendingImageReference, setPendingImageReference] = useState<
    string | null
  >(null);
  const [framing, setFraming] = useState({
    zoom: item?.cropZoom ?? 1,
    x: item?.cropX ?? 0,
    y: item?.cropY ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [websitePickerOpen, setWebsitePickerOpen] = useState(false);
  const urlButton = useRef<HTMLButtonElement>(null);
  const classificationRequest = useRef(0);
  const dropImportInProgress = useRef(false);
  const pendingImageReferenceRef = useRef<string | null>(null);
  const categoryWasEdited = useRef(Boolean(item));
  const subtypeWasEdited = useRef(Boolean(item));
  const [classification, setClassification] =
    useState<ImageClassificationResult | null>(null);
  const [classifying, setClassifying] = useState(false);

  useEffect(
    () => () => {
      classificationRequest.current += 1;
    },
    [],
  );

  function analyzeImage(reference: string) {
    const request = ++classificationRequest.current;
    setClassification(null);
    setClassifying(true);
    void classifyManagedImage(reference)
      .then((result) => {
        if (request !== classificationRequest.current) return;
        setClassification(result);
        if (
          canApplyCategorySuggestion(
            request,
            classificationRequest.current,
            categoryWasEdited.current,
            result.suggestedCategory,
          )
        )
          setCategory(result.suggestedCategory);
        if (
          canApplySubtypeSuggestion(
            request,
            classificationRequest.current,
            categoryWasEdited.current,
            subtypeWasEdited.current,
            result.suggestedSubtype,
          )
        )
          setSubtype(result.suggestedSubtype);
      })
      .catch(() => {
        // Classification is optional; manual item creation must remain available.
      })
      .finally(() => {
        if (request === classificationRequest.current) setClassifying(false);
      });
  }

  function returnToItem() {
    setWebsitePickerOpen(false);
    requestAnimationFrame(() => urlButton.current?.focus());
  }

  function acceptWebsiteImage(
    imported: ManagedImage,
    importedFrom: string,
    pageTitle: string | null,
  ) {
    const previousPending = pendingImageReference;
    setImage(imported);
    setFraming({ zoom: 1, x: 0, y: 0 });
    setPendingImageReference(imported.reference);
    pendingImageReferenceRef.current = imported.reference;
    setSourceUrl(importedFrom);
    if (pageTitle?.trim())
      setName((current) => (current.trim() ? current : pageTitle.trim()));
    setError(null);
    returnToItem();
    if (!item) analyzeImage(imported.reference);
    if (previousPending)
      void discardManagedImage(previousPending).catch(() => undefined);
  }

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
      setFraming({ zoom: 1, x: 0, y: 0 });
      setPendingImageReference(imported.reference);
      pendingImageReferenceRef.current = imported.reference;
      if (!item) analyzeImage(imported.reference);
      if (previousPending) await discardManagedImage(previousPending);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (item || websitePickerOpen) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type !== "drop" || dropImportInProgress.current)
          return;
        const paths = event.payload.paths;
        if (paths.length !== 1) {
          setError("Drop one JPEG, PNG, or WebP image at a time.");
          return;
        }
        dropImportInProgress.current = true;
        setBusy(true);
        setError(null);
        void importImageFromPath(paths[0])
          .then(async (imported) => {
            if (!active) {
              await discardManagedImage(imported.reference).catch(
                () => undefined,
              );
              return;
            }
            const previousPending = pendingImageReferenceRef.current;
            setImage(imported);
            setFraming({ zoom: 1, x: 0, y: 0 });
            setPendingImageReference(imported.reference);
            pendingImageReferenceRef.current = imported.reference;
            analyzeImage(imported.reference);
            if (previousPending)
              await discardManagedImage(previousPending).catch(() => undefined);
          })
          .catch((cause) => {
            if (active) setError(errorMessage(cause));
          })
          .finally(() => {
            dropImportInProgress.current = false;
            if (active) setBusy(false);
          });
      })
      .then((stop) => {
        if (active) unlisten = stop;
        else stop();
      })
      .catch(() => undefined);
    return () => {
      active = false;
      unlisten?.();
    };
  }, [item, websitePickerOpen]);

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
    let normalizedSourceUrl: string | undefined;
    if (sourceUrl.trim()) {
      try {
        const parsed = new URL(sourceUrl.trim());
        if (
          !["http:", "https:"].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password
        )
          throw new Error();
        normalizedSourceUrl = parsed.href;
      } catch {
        setError("Enter a complete item URL beginning with https://.");
        return;
      }
    }
    setBusy(true);
    let createdDisplayReference: string | null = null;
    const values = {
      name: name.trim(),
      category,
      subtype: subtype.trim() || undefined,
      size: size || undefined,
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
      favorite: item?.favorite ?? false,
      sourceUrl: normalizedSourceUrl,
      imagePath: image.reference,
      displayImagePath: item?.displayImagePath,
      cropZoom: framing.zoom,
      cropX: framing.x,
      cropY: framing.y,
      notes: notes.trim() || undefined,
    };
    try {
      const rendered = await renderDisplayImage(image.dataUrl, framing);
      const display = await saveDisplayImage(rendered);
      createdDisplayReference = display.reference;
      values.displayImagePath = display.reference;
      if (item)
        await clothingRepository.update(item.id, { ...values, id: item.id });
      else await clothingRepository.create(values);
      setPendingImageReference(null);
      onSaved(item ? "Item updated." : "Item added to your closet.");
    } catch (cause) {
      if (createdDisplayReference)
        await discardManagedImage(createdDisplayReference).catch(
          () => undefined,
        );
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
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy && !websitePickerOpen)
            void cancel();
        }}
      >
        {websitePickerOpen ? (
          <WebsiteImagePicker
            onBack={returnToItem}
            onSelected={acceptWebsiteImage}
          />
        ) : (
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
                disabled={busy}
                onClick={cancel}
              >
                ×
              </button>
            </div>
            <div className="item-form-layout">
              <div className="form-photo-column">
                {image ? (
                  <ImageCropEditor
                    source={image.dataUrl}
                    framing={framing}
                    onChange={setFraming}
                  />
                ) : (
                  <div className="image-preview form-image-preview" data-empty>
                    <div>
                      <span aria-hidden="true">◇</span>
                      <p>JPEG, PNG, or WebP</p>
                    </div>
                  </div>
                )}
                <button
                  className="secondary-button full-button"
                  type="button"
                  disabled={busy}
                  onClick={chooseImage}
                >
                  {image ? "Replace photo" : "Choose photo"}
                </button>
                <button
                  ref={urlButton}
                  className="secondary-button full-button website-import-button"
                  type="button"
                  disabled={busy}
                  onClick={() => setWebsitePickerOpen(true)}
                >
                  Get from URL
                </button>
                <p className="field-help">
                  Drop a photo anywhere in the app, or choose one. The app keeps
                  a private copy and never changes your original.
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
                    onChange={(event) => {
                      categoryWasEdited.current = true;
                      setCategory(event.target.value as ClothingCategory);
                    }}
                  >
                    {clothingCategories.map((value) => (
                      <option key={value} value={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                  {classifying && <small>Checking the photo locally…</small>}
                  {!classifying && classification?.suggestedCategory && (
                    <small>
                      Suggested from photo · relative confidence{" "}
                      {Math.round(classification.confidenceScore * 100)}%
                    </small>
                  )}
                </label>
                <label className="form-field">
                  <span>Subtype</span>
                  <input
                    value={subtype}
                    onChange={(event) => {
                      subtypeWasEdited.current = true;
                      setSubtype(event.target.value);
                    }}
                    placeholder="T-shirt"
                  />
                </label>
                <label className="form-field">
                  <span>Size</span>
                  <input
                    value={size}
                    onChange={(event) => setSize(event.target.value)}
                    placeholder="XS, M, XXXL, 38, 10..."
                  />
                </label>
                <label className="form-field form-field-wide">
                  <span>Item URL</span>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="https://www.shop.com/product"
                  />
                  <small>
                    Filled automatically when you choose a photo with Get from
                    URL.
                  </small>
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
                <button
                  className="primary-button"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? "Saving…" : item ? "Save changes" : "Add item"}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
