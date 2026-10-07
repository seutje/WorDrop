import { useEffect, useState } from "react";
import { wearRepository, type WearEvent } from "../lib/database/wearRepository";
import { localDate } from "../lib/wearHistory";
import { ConfirmDialog } from "./ConfirmDialog";

export function WearHistory({
  targetId,
  isOutfit = false,
  disabled = false,
}: {
  targetId: string;
  isOutfit?: boolean;
  disabled?: boolean;
}) {
  const [events, setEvents] = useState<WearEvent[]>([]);
  const [date, setDate] = useState(localDate);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [removing, setRemoving] = useState<WearEvent>();
  useEffect(() => {
    let active = true;
    wearRepository
      .list()
      .then((history) => {
        if (active) setEvents(history);
      })
      .catch(() => {
        if (active)
          setError(
            "Wear history could not be loaded. Try opening this page again.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [targetId]);
  const history = events.filter((event) =>
    isOutfit ? event.outfitId === targetId : event.itemIds.includes(targetId),
  );
  const days = new Set(history.map((event) => event.wornOn)).size;
  async function record() {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await wearRepository.record(targetId, isOutfit, date);
      setEvents(await wearRepository.list());
      setNotice(
        isOutfit
          ? "Wear recorded for this outfit and all its pieces."
          : "Wear recorded.",
      );
    } catch (failure) {
      setError(
        typeof failure === "string"
          ? failure
          : "Wear history could not be refreshed or saved. Check the history before trying again. Your clothing is preserved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await wearRepository.delete(removing.id);
      setEvents((current) =>
        current.filter((event) => event.id !== removing.id),
      );
      setRemoving(undefined);
      setNotice("Wear entry removed.");
    } catch {
      setError(
        "The wear entry could not be removed. Your history was preserved. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="detail-panel wear-history" aria-label="Wear history">
      <h2>Wear history</h2>
      <p>
        {loading
          ? "Loading wear history…"
          : days
            ? `Worn on ${days} ${days === 1 ? "day" : "days"}. Last worn: ${history[0].wornOn}.`
            : "No wears recorded yet."}
      </p>
      {isOutfit && (
        <p>Records every piece in the saved outfit. Save any changes first.</p>
      )}
      <div className="wear-controls">
        <label>
          Worn on
          <input
            type="date"
            value={date}
            max={localDate()}
            required
            onChange={(event) => setDate(event.target.value)}
            disabled={busy || disabled}
          />
        </label>
        <button
          className="secondary-button"
          type="button"
          disabled={busy || disabled || loading || !date}
          onClick={() => void record()}
        >
          Mark as worn
        </button>
      </div>
      {disabled && <p>Save this outfit before recording a wear.</p>}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="success-banner">
          {notice}
        </p>
      )}
      {history.length > 0 && (
        <details>
          <summary>View wear history ({history.length} entries)</summary>
          <ul className="wear-entries">
            {history.map((event) => (
              <li key={event.id}>
                <span>
                  <time dateTime={event.wornOn}>{event.wornOn}</time>
                  {event.isOutfit &&
                    !isOutfit &&
                    ` · Outfit: ${event.sourceName}`}
                </span>
                {
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => setRemoving(event)}
                  >
                    Remove wear
                  </button>
                }
              </li>
            ))}
          </ul>
        </details>
      )}
      {removing && (
        <ConfirmDialog
          title="Remove this wear entry?"
          confirmLabel="Remove wear"
          busy={busy}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() => void remove()}
        >
          <p>
            {removing.isOutfit
              ? "This removes this outfit wear from every piece recorded with it. Other wear entries are kept."
              : "Only this individual wear entry will be removed."}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
