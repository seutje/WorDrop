import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type ManagedImage = { reference: string; dataUrl: string };

export async function chooseAndImportImage(): Promise<ManagedImage | null> {
  const sourcePath = await open({
    multiple: false,
    directory: false,
    filters: [
      { name: "Clothing images", extensions: ["jpg", "jpeg", "png", "webp"] },
    ],
  });
  if (!sourcePath) return null;
  return invoke<ManagedImage>("import_clothing_image", { sourcePath });
}

export function loadManagedImage(reference: string): Promise<ManagedImage> {
  return invoke("load_clothing_image", { reference });
}

export function discardManagedImage(reference: string): Promise<boolean> {
  return invoke("discard_clothing_image", { reference });
}
