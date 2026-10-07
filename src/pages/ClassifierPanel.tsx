import { useEffect, useState } from "react";
import {
  getClassifierStatus,
  downloadImaJev,
  type ClassifierStatus,
} from "../lib/images/classifierDownload";
import {
  setImageClassifier,
  type AppSettings,
  type ImageClassifier,
} from "../lib/settings";

export function ClassifierPanel({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  const [status, setStatus] = useState<ClassifierStatus>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void getClassifierStatus()
        .then((next) => {
          if (active) {
            setStatus(next);
          }
        })
        .catch(() => {
          if (active)
            setError(
              "The classifier status could not be loaded. Open this tab again to retry.",
            );
        });
    refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);
  async function download() {
    setRequesting(true);
    setError(undefined);
    try {
      setStatus(await downloadImaJev());
    } catch (cause) {
      setError(
        typeof cause === "string"
          ? cause
          : "ImaJev could not be downloaded. Check your connection and free disk space, then retry.",
      );
    } finally {
      setRequesting(false);
    }
  }
  async function select(classifier: ImageClassifier) {
    setSaving(true);
    setError(undefined);
    try {
      onSettingsChange(await setImageClassifier(classifier));
    } catch (cause) {
      setError(
        typeof cause === "string"
          ? cause
          : "The classifier could not be changed. Your previous selection is still in use.",
      );
    } finally {
      setSaving(false);
    }
  }
  const downloading = requesting || status?.downloading;
  return (
    <div className="settings-panel" role="tabpanel" aria-label="Classifier">
      <div>
        <p className="eyebrow">Photo assistance</p>
        <h2>Image classifier</h2>
        <p>
          Suggest details when adding a photo. Review or change any suggestion
          before saving. Photos stay on your computer.
        </p>
      </div>
      <fieldset className="classifier-options" disabled={saving}>
        <legend>Use for new clothing photos</legend>
        <label className="preference-row">
          <span>
            <strong>FashionCLIP</strong>
            <small>
              Included with WorDrop. Fast, offline category and subtype
              suggestions.
            </small>
          </span>
          <input
            type="radio"
            name="classifier"
            value="fashionclip"
            checked={(settings.classifier ?? "fashionclip") === "fashionclip"}
            onChange={() => void select("fashionclip")}
          />
        </label>
        <label className="preference-row">
          <span>
            <strong>ImaJev 4B INT4</strong>
            <small>
              Optional experimental classifier. Category and subtype
              suggestions, plus a local color estimate. May take longer and use
              more memory.
            </small>
          </span>
          <input
            type="radio"
            name="classifier"
            value="imajev"
            checked={settings.classifier === "imajev"}
            disabled={!status?.ready}
            onChange={() => void select("imajev")}
          />
        </label>
      </fieldset>
      <p>
        Download about 3 GB once to use ImaJev offline. Internet is needed only
        for the download. Keep WorDrop open until it finishes.
      </p>
      {!status?.ready && (
        <button
          className="primary-button"
          type="button"
          disabled={!status || downloading}
          onClick={() => void download()}
        >
          {downloading ? "Downloading ImaJev…" : "Download ImaJev 4B INT4"}
        </button>
      )}
      {downloading && status && (
        <div>
          <progress
            aria-label="ImaJev download progress"
            max={status.totalBytes || 1}
            value={status.downloadedBytes}
          />
          <p>
            {(status.downloadedBytes / 1e9).toFixed(2)} /{" "}
            {(status.totalBytes / 1e9).toFixed(2)} GB
          </p>
        </div>
      )}
      <p role="status">
        {status?.ready
          ? "ImaJev is downloaded and ready. Select it above to use it."
          : status?.message}
      </p>
      {(error || status?.error) && (
        <p className="error-banner" role="alert">
          {error || status?.error}
        </p>
      )}
      {settings.classifier === "imajev" && status && !status.ready && (
        <p className="error-banner">
          ImaJev files are missing. Download them again or select FashionCLIP.
        </p>
      )}
    </div>
  );
}
