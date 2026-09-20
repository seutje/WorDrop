import {
  check,
  type DownloadEvent,
  type Update,
} from "@tauri-apps/plugin-updater";

export type AppUpdate = Update;
export type AppUpdateDownloadEvent = DownloadEvent;

export async function checkForAppUpdate(): Promise<AppUpdate | null> {
  return check({ timeout: 15_000 });
}

export async function installAppUpdate(
  update: AppUpdate,
  onEvent: (event: AppUpdateDownloadEvent) => void,
): Promise<void> {
  await update.downloadAndInstall(onEvent);
}
