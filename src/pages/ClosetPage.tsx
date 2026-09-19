import { useState } from "react";
import { ImageImportDialog } from "../features/wardrobe/ImageImportDialog";

export function ClosetPage() {
  const [isImportOpen, setImportOpen] = useState(false);

  return (
    <section className="page" aria-labelledby="closet-heading">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your wardrobe</p>
          <h1 id="closet-heading">Closet</h1>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => setImportOpen(true)}
        >
          + Add item
        </button>
      </header>
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">
          ◇
        </div>
        <h2>Your closet is ready</h2>
        <p>
          Start by importing a clothing photo. The complete item form arrives in
          the next phase.
        </p>
      </div>
      {isImportOpen && (
        <ImageImportDialog onClose={() => setImportOpen(false)} />
      )}
    </section>
  );
}
