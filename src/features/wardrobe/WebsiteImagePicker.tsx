import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  discardManagedImage,
  type ManagedImage,
} from "../../lib/images/managedImages";
import {
  findWebsiteImages,
  cancelWebsiteImageBrowser,
  importWebsiteImage,
  previewWebsiteImage,
  type WebsiteImages,
} from "../../lib/images/websiteImages";

type Props = { onBack: () => void; onSelected: (image: ManagedImage) => void };
type Preview = { dataUrl?: string; failed?: boolean };

export function WebsiteImagePicker({ onBack, onSelected }: Props) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<WebsiteImages | null>(null);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [showMore, setShowMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [finding, setFinding] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const pendingPreviews = useRef(new Set<string>());
  const previewCache = useRef<Record<string, Preview>>({});
  const activeDownloads = useRef(0);
  const busy = finding || selectedUrl !== null;

  useEffect(
    () => () => {
      generation.current += 1;
      void cancelWebsiteImageBrowser().catch(() => undefined);
    },
    [],
  );

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      generation.current += 1;
      onBack();
    }
    // A disabled submit button can lose focus while fetching, so listen at the
    // document level to keep Escape available throughout the request.
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onBack]);

  const candidates =
    result?.images.filter((image) => showMore || image.suggested) ?? [];
  const visible = candidates.slice(0, visibleCount);
  // Limit native downloads to three at a time. Only revealed results are fetched.
  useEffect(() => {
    if (!result || busy) return;
    const current = generation.current;
    const queue = result.images
      .filter((image) => showMore || image.suggested)
      .slice(0, visibleCount);
    for (const image of queue) {
      if (activeDownloads.current >= 3) break;
      if (
        previewCache.current[image.url] ||
        pendingPreviews.current.has(image.url)
      )
        continue;
      pendingPreviews.current.add(image.url);
      activeDownloads.current += 1;
      void (async () => {
        let preview: Preview;
        try {
          preview = { dataUrl: await previewWebsiteImage(image.url) };
        } catch {
          preview = { failed: true };
        }
        activeDownloads.current -= 1;
        if (generation.current !== current) {
          // Wake the queue if a newer search is waiting for these download slots.
          setPreviews((previous) => ({ ...previous }));
          return;
        }
        pendingPreviews.current.delete(image.url);
        previewCache.current[image.url] = preview;
        setPreviews((previous) => ({ ...previous, [image.url]: preview }));
      })();
    }
  }, [result, showMore, visibleCount, busy, previews]);

  async function find(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    let normalized: URL;
    try {
      normalized = new URL(url.trim());
      if (
        !["http:", "https:"].includes(normalized.protocol) ||
        normalized.username ||
        normalized.password
      )
        throw new Error();
    } catch {
      setError("Enter a complete website link beginning with https://.");
      return;
    }
    const current = ++generation.current;
    setFinding(true);
    setError(null);
    setResult(null);
    setPreviews({});
    previewCache.current = {};
    pendingPreviews.current = new Set();
    setShowMore(false);
    setVisibleCount(12);
    try {
      const found = await findWebsiteImages(normalized.href);
      if (generation.current === current) setResult(found);
    } catch (cause) {
      if (generation.current === current)
        setError(
          typeof cause === "string"
            ? cause
            : "The website could not be loaded. Try again or choose a photo from your computer.",
        );
    } finally {
      if (generation.current === current) setFinding(false);
    }
  }

  async function select(imageUrl: string) {
    if (busy) return;
    const current = generation.current;
    setSelectedUrl(imageUrl);
    setError(null);
    try {
      const image = await importWebsiteImage(imageUrl);
      if (generation.current !== current) {
        await discardManagedImage(image.reference).catch(() => undefined);
        return;
      }
      onSelected(image);
    } catch (cause) {
      if (generation.current === current)
        setError(
          typeof cause === "string"
            ? cause
            : "This photo could not be downloaded. Your current photo has not changed. Choose another image or try again.",
        );
    } finally {
      if (generation.current === current) setSelectedUrl(null);
    }
  }

  function back() {
    generation.current += 1;
    onBack();
  }

  return (
    <div className="website-picker-step">
      <div className="dialog-heading sticky-heading">
        <div>
          <p className="eyebrow">New wardrobe photo</p>
          <h2 id="item-form-title">Get from URL</h2>
        </div>
        <button className="secondary-button" type="button" onClick={back}>
          Back to item
        </button>
      </div>
      <div className="website-picker">
        <p className="field-help">
          Paste a product link to find photos. This step needs an internet
          connection.
        </p>
        <form className="website-url-form" onSubmit={find}>
          <label className="form-field">
            <span>Website URL</span>
            <input
              autoFocus
              type="text"
              inputMode="url"
              required
              placeholder="https://www.shop.com/product"
              value={url}
              disabled={busy}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            {finding ? "Finding images…" : "Find images"}
          </button>
        </form>
        {busy && (
          <div className="website-progress" role="status">
            <span>
              {finding
                ? "Looking for photos on this page…"
                : "Downloading your photo…"}
            </span>
            <button className="secondary-button" type="button" onClick={back}>
              Cancel
            </button>
          </div>
        )}
        {finding && (
          <p className="field-help">
            If a website window opens, complete any verification there. Its
            photos will return here automatically.
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {result && (
          <>
            <p className="field-help" role="status">
              {result.images.length
                ? `Choose a photo from ${new URL(result.pageUrl).hostname}. You can adjust the crop next.`
                : "No supported photos were found. This page may need a browser or may block downloads. Try another link, or go back and choose a photo from your computer."}
            </p>
            {result.images.length > 0 && candidates.length === 0 && (
              <p>
                No likely product photos found. Try showing more images below.
              </p>
            )}
            <div className="website-image-grid">
              {visible.map((image, index) => {
                const preview = previews[image.url];
                return (
                  <button
                    className="website-image-choice"
                    type="button"
                    key={image.url}
                    disabled={busy || !preview?.dataUrl || preview.failed}
                    aria-label={`Use image ${index + 1}: ${image.label || "Website photo"}`}
                    onClick={() => void select(image.url)}
                  >
                    <span className="website-image-preview">
                      {preview?.dataUrl && !preview.failed ? (
                        <img
                          src={preview.dataUrl}
                          alt={image.label}
                          onError={() =>
                            setPreviews((previous) => ({
                              ...previous,
                              [image.url]: { failed: true },
                            }))
                          }
                        />
                      ) : (
                        <span>
                          {preview?.failed
                            ? "Preview unavailable"
                            : "Loading photo…"}
                        </span>
                      )}
                    </span>
                    <span>
                      {selectedUrl === image.url
                        ? "Downloading…"
                        : preview?.failed
                          ? "Try another photo"
                          : `Use image ${index + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="action-group website-more-actions">
              {!showMore && result.images.some((image) => !image.suggested) && (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setShowMore(true);
                    setVisibleCount((count) =>
                      Math.max(count, candidates.length + 12),
                    );
                  }}
                >
                  Show more images
                </button>
              )}
              {visibleCount < candidates.length && (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy}
                  onClick={() => setVisibleCount((count) => count + 12)}
                >
                  Load more photos
                </button>
              )}
            </div>
            {result.images.length > 0 && (
              <p className="field-help">
                Missing the photo you want? Go back to choose a photo from your
                computer. Some websites do not allow automatic downloads.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
