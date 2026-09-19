import { useEffect, useState } from "react";
import { ClothingCard } from "../features/wardrobe/ClothingCard";
import { ClothingItemForm } from "../features/wardrobe/ClothingItemForm";
import { clothingRepository } from "../lib/database/clothingRepository";
import type { ClothingItem } from "../types/clothing";

export function ClosetPage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [editingItem, setEditingItem] = useState<ClothingItem>();
  const [isFormOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      setItems(await clothingRepository.list());
    } catch {
      setError(
        "Your closet could not be loaded. Your saved data is still on this computer.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    clothingRepository
      .list()
      .then((loadedItems) => {
        if (active) setItems(loadedItems);
      })
      .catch(() => {
        if (active)
          setError(
            "Your closet could not be loaded. Your saved data is still on this computer.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  function openAdd() {
    setEditingItem(undefined);
    setNotice(null);
    setFormOpen(true);
  }
  function openEdit(item: ClothingItem) {
    setEditingItem(item);
    setNotice(null);
    setFormOpen(true);
  }
  async function finishForm(message: string) {
    setFormOpen(false);
    setEditingItem(undefined);
    setNotice(message);
    await loadItems();
  }

  return (
    <section className="page" aria-labelledby="closet-heading">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your wardrobe</p>
          <h1 id="closet-heading">Closet</h1>
        </div>
        <button className="primary-button" type="button" onClick={openAdd}>
          + Add item
        </button>
      </header>
      {notice && (
        <p className="success-banner" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadItems}>
            Try again
          </button>
        </div>
      )}
      {loading && <p className="loading-message">Opening your closet…</p>}
      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            ◇
          </div>
          <h2>Your closet is ready</h2>
          <p>
            Add a photo and a few details to create your first wardrobe item.
          </p>
          <button
            className="secondary-button empty-action"
            type="button"
            onClick={openAdd}
          >
            Add your first item
          </button>
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className="closet-grid" aria-label="Clothing items">
          {items.map((item) => (
            <ClothingCard
              item={item}
              key={item.id}
              onEdit={() => openEdit(item)}
            />
          ))}
        </div>
      )}
      {isFormOpen && (
        <ClothingItemForm
          item={editingItem}
          onCancel={() => setFormOpen(false)}
          onSaved={finishForm}
        />
      )}
    </section>
  );
}
