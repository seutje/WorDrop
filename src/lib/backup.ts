import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export type BackupSummary = {
  path: string;
  clothingItems: number;
  outfits: number;
  images: number;
};

const backupFilter = [{ name: "WorDrop backup", extensions: ["wordrop"] }];

export async function chooseAndExportBackup(): Promise<BackupSummary | null> {
  const date = new Date().toISOString().slice(0, 10);
  const destinationPath = await save({
    defaultPath: `wordrop-backup-${date}.wordrop`,
    filters: backupFilter,
  });
  if (!destinationPath) return null;
  return invoke("export_backup", { destinationPath });
}

export async function chooseBackupToRestore(): Promise<string | null> {
  const sourcePath = await open({
    multiple: false,
    directory: false,
    filters: backupFilter,
  });
  return sourcePath;
}

export function restoreBackup(sourcePath: string): Promise<BackupSummary> {
  return invoke("restore_backup", { sourcePath });
}
