export function ClosetPage() {
  return (
    <section className="page" aria-labelledby="closet-heading">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your wardrobe</p>
          <h1 id="closet-heading">Closet</h1>
        </div>
        <button className="primary-button" type="button" disabled>
          + Add item
        </button>
      </header>
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">
          ◇
        </div>
        <h2>Your closet is ready</h2>
        <p>
          Clothing items will appear here once item creation is added in a later
          phase.
        </p>
      </div>
    </section>
  );
}
