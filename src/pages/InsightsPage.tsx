import { useEffect, useMemo, useState } from "react";
import { clothingRepository } from "../lib/database/clothingRepository";
import { outfitRepository } from "../lib/database/outfitRepository";
import { wearRepository, type WearEvent } from "../lib/database/wearRepository";
import {
  buildWardrobeInsights,
  type DistributionRow,
  type InsightScope,
  type WearPeriod,
} from "../lib/wardrobeInsights";
import type { ClothingItem } from "../types/clothing";
import type { Outfit } from "../types/outfit";
import "./insights.css";

const label = (value: string) =>
  value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
function Breakdown({
  title,
  rows,
  note = "Share of selected items",
}: {
  title: string;
  rows: DistributionRow[];
  note?: string;
}) {
  return (
    <section className="insight-panel" aria-label={title}>
      <h2>{title}</h2>
      <p className="insight-note">{note}</p>
      <ul className="insight-bars">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="insight-bar-label">
              <span>{label(row.label)}</span>
              <span>
                <strong>{row.count}</strong> · {Math.round(row.percentage)}%
              </span>
            </div>
            <div className="insight-track" aria-hidden="true">
              <div style={{ width: `${row.percentage}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
function Ranking({
  title,
  rows,
  unit,
  empty,
  onInspectItem,
}: {
  title: string;
  rows: { item: ClothingItem; count: number; lastWorn?: string }[];
  unit: string;
  empty: string;
  onInspectItem: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="insight-panel" aria-label={title}>
      <h2>{title}</h2>
      {rows.length ? (
        <ol className="insight-ranking">
          {(expanded ? rows : rows.slice(0, 5)).map((row) => (
            <li key={row.item.id}>
              <button type="button" onClick={() => onInspectItem(row.item.id)}>
                <strong>{row.item.name}</strong>
                <small>
                  {label(row.item.category)}
                  {row.item.subtype ? ` · ${row.item.subtype}` : ""}
                  {row.lastWorn ? ` · Last worn ${row.lastWorn}` : ""}
                </small>
              </button>
              <span>
                {row.count} {unit}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p>{empty}</p>
      )}
      {rows.length > 5 && (
        <button
          className="secondary-button"
          type="button"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  );
}
function Summary({ values }: { values: [string, string | number][] }) {
  return (
    <div className="insight-summary">
      {values.map(([title, value]) => (
        <div key={title}>
          <strong>{value}</strong>
          <span>{title}</span>
        </div>
      ))}
    </div>
  );
}
export function InsightsPage({
  onInspectItem,
}: {
  onInspectItem: (id: string) => void;
}) {
  const [data, setData] = useState<{
    items: ClothingItem[];
    outfits: Outfit[];
    events: WearEvent[];
  }>();
  const [error, setError] = useState(false);
  const [request, setRequest] = useState(0);
  const [scope, setScope] = useState<InsightScope>("owned");
  const [period, setPeriod] = useState<WearPeriod>("all");
  useEffect(() => {
    let active = true;
    Promise.all([
      clothingRepository.list(),
      outfitRepository.list(),
      wearRepository.list(),
    ])
      .then(([items, outfits, events]) => {
        if (active) setData({ items, outfits, events });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [request]);
  const insights = useMemo(
    () =>
      data
        ? buildWardrobeInsights(
            data.items,
            data.outfits,
            data.events,
            scope,
            period,
          )
        : undefined,
    [data, scope, period],
  );
  return (
    <section className="page insights-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Know your wardrobe</p>
          <h1>Insights</h1>
          <p>Explore what you own and what you reach for.</p>
        </div>
      </header>
      {error ? (
        <div role="alert" className="empty-state">
          <p>
            Your wardrobe insights could not be loaded. Your saved data is
            preserved. Try again.
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setError(false);
              setRequest((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : !insights ? (
        <p role="status">Loading wardrobe insights…</p>
      ) : (
        <>
          <div className="insight-filters">
            <label>
              Wardrobe selection
              <select
                value={scope}
                onChange={(event) =>
                  setScope(event.target.value as InsightScope)
                }
              >
                <option value="owned">Owned</option>
                <option value="wishlist">Wishlist</option>
                <option value="all">All items</option>
              </select>
            </label>
            <label>
              Wear history range
              <select
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value as WearPeriod)
                }
              >
                <option value="all">All time</option>
                <option value="1">Past month</option>
                <option value="3">Past 3 months</option>
                <option value="6">Past 6 months</option>
                <option value="12">Past year</option>
              </select>
            </label>
          </div>
          {!insights.selected.length ? (
            <div className="empty-state">
              <h2>
                {data?.items.length
                  ? "No items in this selection"
                  : "Your wardrobe story starts here"}
              </h2>
              <p>
                {data?.items.length
                  ? "Choose another wardrobe selection to explore your items."
                  : "Add your first pieces in Closet to see your wardrobe insights."}
              </p>
            </div>
          ) : (
            <>
              <Summary
                values={[
                  ["Items", insights.selected.length],
                  ["Owned", insights.ownedCount],
                  ["Wishlist", insights.wishlistCount],
                  ["Favorites", insights.favorites],
                  ["Saved outfits using these items", insights.outfitCount],
                ]}
              />
              <h2 className="insight-section-title">
                Your wardrobe at a glance
              </h2>
              <p className="insight-note">
                Counts reflect your wardrobe selection. Pieces with multiple
                tags appear in each group, so percentages can add up to more
                than 100%. Missing details appear as “Not specified”.
              </p>
              <div className="insight-grid">
                <Breakdown title="Categories" rows={insights.categories} />
                <Breakdown title="Colors" rows={insights.colors} />
                <Breakdown title="Occasions" rows={insights.occasions} />
                <Breakdown title="Seasons" rows={insights.seasons} />
              </div>
              <h2 className="insight-section-title">Subtypes by category</h2>
              <div className="insight-grid">
                {insights.subtypes.map((group) => (
                  <Breakdown
                    key={group.category}
                    title={label(group.category)}
                    rows={group.rows}
                    note={`${group.total} items · share within this category`}
                  />
                ))}
              </div>
              <h2 className="insight-section-title">What you wear</h2>
              <p className="insight-note">
                Owned pieces only, within your wear history range. Each piece
                counts once per day, including wears recorded through outfits.
                Zero means no recorded wears in this range. Record wears in item
                details or a saved outfit.
              </p>
              {insights.ownedCount ? (
                <>
                  <Summary
                    values={[
                      [
                        "Pieces worn",
                        `${insights.wornCount} / ${insights.ownedCount}`,
                      ],
                      [
                        "Wardrobe worn",
                        `${Math.round((insights.wornCount / insights.ownedCount) * 100)}%`,
                      ],
                      [
                        "No recorded wears",
                        insights.ownedCount - insights.wornCount,
                      ],
                      ["Days with recorded wears", insights.wearDays],
                      ["Total piece wear days", insights.totalPieceDays],
                    ]}
                  />
                  <div className="insight-grid">
                    <Ranking
                      key={`most-${scope}-${period}`}
                      title="Most worn"
                      rows={insights.mostWorn}
                      unit="wear days"
                      empty="No wears recorded in this range yet."
                      onInspectItem={onInspectItem}
                    />
                    <Ranking
                      key={`least-${scope}-${period}`}
                      title="Least worn"
                      rows={insights.leastWorn}
                      unit="wear days"
                      empty="No owned pieces."
                      onInspectItem={onInspectItem}
                    />
                  </div>
                </>
              ) : (
                <p>Choose Owned or All items to see wear insights.</p>
              )}
              <h2 className="insight-section-title">Outfit rotation</h2>
              <p className="insight-note">
                Saved outfit membership is separate from recorded wear history
                and uses all saved outfits.
              </p>
              <div className="insight-grid">
                <Ranking
                  key={`outfits-${scope}`}
                  title="Most used in saved outfits"
                  rows={insights.outfitUsage.filter((row) => row.count > 0)}
                  unit="outfits"
                  empty="Save an outfit to see which pieces you combine most."
                  onInspectItem={onInspectItem}
                />
                <Ranking
                  key={`unused-${scope}`}
                  title="Not in any saved outfit"
                  rows={insights.unusedInOutfits}
                  unit="outfits"
                  empty="Every selected piece appears in a saved outfit."
                  onInspectItem={onInspectItem}
                />
              </div>
              <h2 className="insight-section-title">The finer details</h2>
              <div className="insight-grid">
                <Breakdown title="Materials" rows={insights.materials} />
                <Breakdown title="Patterns" rows={insights.patterns} />
                <Breakdown title="Style tags" rows={insights.styles} />
                <Breakdown title="Sizes" rows={insights.sizes} />
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
