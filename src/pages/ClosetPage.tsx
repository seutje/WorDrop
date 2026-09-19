import { useEffect, useMemo, useState } from "react";
import { ClothingCard } from "../features/wardrobe/ClothingCard";
import { ClothingDetail } from "../features/wardrobe/ClothingDetail";
import { ClothingItemForm } from "../features/wardrobe/ClothingItemForm";
import {
  emptyClosetFilters,
  filterClothingItems,
  hasActiveFilters,
  type ClosetFilters,
} from "../features/wardrobe/closetFilters";
import { clothingRepository } from "../lib/database/clothingRepository";
import {
  clothingCategories,
  clothingColors,
  occasions,
  ownershipStates,
  seasons,
  type ClothingItem,
} from "../types/clothing";

const titleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function ClosetPage({
  onStartOutfit,
}: {
  onStartOutfit: (itemIds: string[]) => void;
}) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [editingItem, setEditingItem] = useState<ClothingItem>();
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [isFormOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClosetFilters>(emptyClosetFilters);
  const visibleItems = useMemo(
    () => filterClothingItems(items, filters),
    [items, filters],
  );
  const filtersActive = hasActiveFilters(filters);

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
    setSelectedItemId(undefined);
    setNotice(message);
    await loadItems();
  }

  if (selectedItemId && !isFormOpen)
    return (
      <ClothingDetail
        key={selectedItemId}
        itemId={selectedItemId}
        onBack={() => setSelectedItemId(undefined)}
        onEdit={openEdit}
        onInspectItem={setSelectedItemId}
        onStartOutfit={onStartOutfit}
        onDeleted={(message) => {
          setSelectedItemId(undefined);
          setNotice(message);
          void loadItems();
        }}
      />
    );

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
        <>
          <div className="closet-controls">
            <label className="search-control">
              <span className="sr-only">Search by item name</span>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search your closet…"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
              />
            </label>
            <div className="filter-row" aria-label="Closet filters">
              <label>
                <span className="sr-only">Category</span>
                <select
                  value={filters.category}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      category: event.target.value as ClosetFilters["category"],
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
                  value={filters.ownership}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      ownership: event.target
                        .value as ClosetFilters["ownership"],
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
                  value={filters.color}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      color: event.target.value as ClosetFilters["color"],
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
                  value={filters.season}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      season: event.target.value as ClosetFilters["season"],
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
                  value={filters.occasion}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      occasion: event.target.value as ClosetFilters["occasion"],
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
              {filtersActive && (
                <button
                  className="clear-filters"
                  type="button"
                  onClick={() => setFilters(emptyClosetFilters)}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
          <div className="closet-results-heading">
            <p>
              {visibleItems.length}{" "}
              {visibleItems.length === 1 ? "item" : "items"}
            </p>
          </div>
          {visibleItems.length > 0 ? (
            <div className="closet-grid" aria-label="Clothing items">
              {visibleItems.map((item) => (
                <ClothingCard
                  item={item}
                  key={item.id}
                  onOpen={() => setSelectedItemId(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <h2>No matching items</h2>
              <p>Try a different search or clear your filters.</p>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setFilters(emptyClosetFilters)}
              >
                Clear filters
              </button>
            </div>
          )}
        </>
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
