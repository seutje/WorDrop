export function OutfitsPage() {
  return (
    <section className="page" aria-labelledby="outfits-heading">
      <header className="page-header">
        <div>
          <p className="eyebrow">Saved combinations</p>
          <h1 id="outfits-heading">Outfits</h1>
        </div>
      </header>
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">
          ♧
        </div>
        <h2>A place for your favorite looks</h2>
        <p>Outfit building and saved looks will arrive in a later phase.</p>
      </div>
    </section>
  );
}
