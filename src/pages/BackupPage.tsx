import { useState } from "react";
import {
  chooseAndExportBackup,
  chooseBackupToRestore,
  restoreBackup,
  type BackupSummary,
} from "../lib/backup";

function errorDetail(error: unknown) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "The selected location may not be writable.";
}

function Summary({
  action,
  summary,
}: {
  action: string;
  summary: BackupSummary;
}) {
  return (
    <p className="success-banner" role="status">
      {action} {summary.clothingItems} clothing{" "}
      {summary.clothingItems === 1 ? "item" : "items"}, {summary.images}{" "}
      {summary.images === 1 ? "image" : "images"}, and {summary.outfits}{" "}
      {summary.outfits === 1 ? "outfit" : "outfits"}.
    </p>
  );
}

export function BackupPage({ embedded = false }: { embedded?: boolean }) {
  const [working, setWorking] = useState<"export" | "restore">();
  const [result, setResult] = useState<{
    action: string;
    summary: BackupSummary;
  }>();
  const [error, setError] = useState<string>();

  async function exportData() {
    setWorking("export");
    setError(undefined);
    setResult(undefined);
    try {
      const summary = await chooseAndExportBackup();
      if (summary) setResult({ action: "Backup saved with", summary });
    } catch (caught) {
      setError(
        `The backup could not be created. Your wardrobe data was not changed. ${errorDetail(caught)}`,
      );
    } finally {
      setWorking(undefined);
    }
  }

  async function restoreData() {
    setError(undefined);
    setResult(undefined);
    try {
      const sourcePath = await chooseBackupToRestore();
      if (!sourcePath) return;
      if (
        !window.confirm(
          "Restore this backup? It will replace your current wardrobe, outfits, and managed images. This cannot be undone unless you export a backup first.",
        )
      )
        return;
      setWorking("restore");
      const summary = await restoreBackup(sourcePath);
      setResult({ action: "Backup restored with", summary });
    } catch (caught) {
      setError(
        `The backup could not be restored. Your existing wardrobe was kept. ${errorDetail(caught)}`,
      );
    } finally {
      setWorking(undefined);
    }
  }

  return (
    <section
      className={embedded ? "backup-page embedded-backup" : "page backup-page"}
      aria-labelledby="backup-heading"
    >
      <header className={embedded ? "embedded-page-header" : "page-header"}>
        <div>
          <p className="eyebrow">Local data safety</p>
          <h1 id="backup-heading">Backup & Restore</h1>
        </div>
      </header>
      {result && <Summary action={result.action} summary={result.summary} />}
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="backup-options">
        <article className="backup-card">
          <div className="backup-card-icon" aria-hidden="true">
            ↓
          </div>
          <div>
            <p className="eyebrow">Protect your wardrobe</p>
            <h2>Export a backup</h2>
            <p>
              Save one portable <code>.wordrop</code> file containing your
              clothing details, saved outfits, and managed images.
            </p>
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={Boolean(working)}
            onClick={() => void exportData()}
          >
            {working === "export"
              ? "Creating backup…"
              : "Choose backup location"}
          </button>
        </article>
        <article className="backup-card backup-restore-card">
          <div className="backup-card-icon" aria-hidden="true">
            ↻
          </div>
          <div>
            <p className="eyebrow">Replace local data</p>
            <h2>Restore a backup</h2>
            <p>
              Restore a complete WorDrop backup. The file is validated before
              your current wardrobe is replaced.
            </p>
          </div>
          <button
            className="danger-button"
            type="button"
            disabled={Boolean(working)}
            onClick={() => void restoreData()}
          >
            {working === "restore" ? "Restoring…" : "Choose backup to restore"}
          </button>
        </article>
      </div>
      <aside className="backup-guidance">
        <h2>Keep backups somewhere safe</h2>
        <p>
          Create a new backup after meaningful wardrobe changes and keep a copy
          outside this computer when possible. Restoring replaces all current
          local data; export the current wardrobe first if you may need it
          later.
        </p>
      </aside>
    </section>
  );
}
