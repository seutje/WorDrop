import { useEffect, useRef, useState } from "react";
import {
  checkForAppUpdate,
  installAppUpdate,
  type AppUpdate,
  type AppUpdateDownloadEvent,
} from "../lib/updates";

type DownloadProgress = {
  downloaded: number;
  total?: number;
};

function updateProgress(
  current: DownloadProgress,
  event: AppUpdateDownloadEvent,
): DownloadProgress {
  if (event.event === "Started")
    return { downloaded: 0, total: event.data.contentLength ?? undefined };
  if (event.event === "Progress")
    return {
      ...current,
      downloaded: current.downloaded + event.data.chunkLength,
    };
  return current;
}

export function UpdatePrompt() {
  const checked = useRef(false);
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress>({ downloaded: 0 });
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    let active = true;

    void checkForAppUpdate()
      .then((availableUpdate) => {
        if (active) setUpdate(availableUpdate);
        else void availableUpdate?.close();
      })
      // Update checks must never prevent or interrupt offline startup.
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  if (!update) return null;

  const percentage = progress.total
    ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
    : undefined;

  async function dismiss() {
    if (installing || !update) return;
    const dismissedUpdate = update;
    setUpdate(null);
    await dismissedUpdate.close().catch(() => undefined);
  }

  async function install() {
    if (!update) return;
    const acceptedUpdate = update;
    setInstalling(true);
    setError(undefined);
    setProgress({ downloaded: 0 });
    try {
      await installAppUpdate(acceptedUpdate, (event) =>
        setProgress((current) => updateProgress(current, event)),
      );
    } catch {
      setInstalling(false);
      setError(
        "The update could not be installed. WorDrop and your wardrobe data were not changed. Check your connection and try again.",
      );
    }
  }

  return (
    <div className="dialog-backdrop update-backdrop" role="presentation">
      <section
        aria-describedby="update-description"
        aria-labelledby="update-title"
        aria-modal="true"
        className="update-dialog"
        role="dialog"
      >
        <p className="eyebrow">Update available</p>
        <h2 id="update-title">WorDrop {update.version} is ready</h2>
        <p id="update-description">
          Install the latest version now, or choose Not now to keep using this
          version. WorDrop will check again the next time it starts.
        </p>
        {update.body && (
          <div className="update-notes">
            <strong>What’s new</strong>
            <p>{update.body}</p>
          </div>
        )}
        {installing && (
          <div className="update-progress" aria-live="polite">
            <div className="update-progress-heading">
              <span>Downloading and verifying…</span>
              {percentage !== undefined && <span>{percentage}%</span>}
            </div>
            <progress max={100} value={percentage} />
            <small>
              WorDrop will close automatically when the installer is ready.
            </small>
          </div>
        )}
        {error && (
          <p className="error-message update-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions update-actions">
          <button
            className="secondary-button"
            disabled={installing}
            onClick={() => void dismiss()}
            type="button"
          >
            Not now
          </button>
          <button
            className="primary-button"
            disabled={installing}
            onClick={() => void install()}
            type="button"
          >
            {installing ? "Preparing update…" : "Download and install"}
          </button>
        </div>
      </section>
    </div>
  );
}
