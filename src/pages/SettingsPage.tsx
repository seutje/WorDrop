import { useState } from "react";
import type { AppSettings } from "../lib/settings";
import { setAllowMultipleBottoms } from "../lib/settings";
import { BackupPage } from "./BackupPage";

type SettingsTab = "preferences" | "backup";

export function SettingsPage({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("preferences");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function updateBottomPreference(allow: boolean) {
    setSaving(true);
    setError(undefined);
    try {
      onSettingsChange(await setAllowMultipleBottoms(allow));
    } catch {
      setError(
        "The preference could not be saved. Your previous setting is still in use.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page settings-page" aria-labelledby="settings-heading">
      <header className="page-header">
        <div>
          <p className="eyebrow">Make WorDrop yours</p>
          <h1 id="settings-heading">Settings</h1>
        </div>
      </header>
      <div className="settings-tabs" role="tablist" aria-label="Settings">
        <button
          role="tab"
          aria-selected={tab === "preferences"}
          type="button"
          onClick={() => setTab("preferences")}
        >
          Preferences
        </button>
        <button
          role="tab"
          aria-selected={tab === "backup"}
          type="button"
          onClick={() => setTab("backup")}
        >
          Backup &amp; Restore
        </button>
      </div>
      {tab === "preferences" ? (
        <div className="settings-panel" role="tabpanel">
          <div>
            <p className="eyebrow">Outfit builder</p>
            <h2>Outfit composition</h2>
            <p>
              Keep outfits practical while leaving room for layered tops and
              accessories.
            </p>
          </div>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          <label className="preference-row">
            <span>
              <strong>Allow multiple bottoms</strong>
              <small>
                When off, an outfit can contain one bottom. Existing saved
                outfits are never changed.
              </small>
            </span>
            <input
              type="checkbox"
              checked={settings.allowMultipleBottoms}
              disabled={saving}
              onChange={(event) =>
                void updateBottomPreference(event.target.checked)
              }
            />
          </label>
        </div>
      ) : (
        <div role="tabpanel">
          <BackupPage embedded />
        </div>
      )}
    </section>
  );
}
