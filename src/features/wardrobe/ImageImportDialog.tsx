import { useState } from "react";
import {
  chooseAndImportImage,
  discardManagedImage,
  type ManagedImage,
} from "../../lib/images/managedImages";

type ImageImportDialogProps = { onClose: () => void };

function messageFrom(error: unknown): string {
  return typeof error === "string"
    ? error
    : "The image could not be imported. Try another file.";
}

export function ImageImportDialog({ onClose }: ImageImportDialogProps) {
  const [image, setImage] = useState<ManagedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function selectImage() {
    setBusy(true);
    setError(null);
    try {
      const imported = await chooseAndImportImage();
      if (!imported) return;
      const previousImage = image;
      setImage(imported);
      if (previousImage) {
        try {
          await discardManagedImage(previousImage.reference);
        } catch {
          setError(
            "The new photo is ready, but the previous managed copy could not be cleaned up.",
          );
        }
      }
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    if (image) {
      try {
        await discardManagedImage(image.reference);
      } catch {
        // Cleanup is best-effort; the user should still be able to close.
      }
    }
    onClose();
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="image-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-dialog-title"
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Phase 2 preview</p>
            <h2 id="image-dialog-title">Import a clothing photo</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close"
            onClick={close}
          >
            ×
          </button>
        </div>

        <div className="image-preview" data-empty={!image}>
          {image ? (
            <img src={image.dataUrl} alt="Imported clothing preview" />
          ) : (
            <div>
              <span aria-hidden="true">◇</span>
              <p>JPEG, PNG, or WebP · up to 25 MB</p>
            </div>
          )}
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {image && (
          <p className="managed-note">
            A private managed copy was created. Your original file was not
            changed.
          </p>
        )}

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={close}>
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={selectImage}
          >
            {busy ? "Importing…" : image ? "Replace photo" : "Choose photo"}
          </button>
        </div>
        <p className="phase-note">
          Clothing details and saving the record are added in Phase 3.
        </p>
      </section>
    </div>
  );
}
