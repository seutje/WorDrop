import { invoke } from "@tauri-apps/api/core";
import type { ManagedImage } from "./managedImages";

export type WebsiteImage = { url: string; label: string; suggested: boolean };
export type WebsiteImages = { pageUrl: string; images: WebsiteImage[] };

export function findWebsiteImages(url: string): Promise<WebsiteImages> {
  return invoke("find_website_images", { url });
}

export function cancelWebsiteImageBrowser(): Promise<void> {
  return invoke("cancel_website_image_browser");
}

export function previewWebsiteImage(url: string): Promise<string> {
  return invoke("preview_website_image", { url });
}

export function importWebsiteImage(url: string): Promise<ManagedImage> {
  return invoke("import_website_image", { url });
}
