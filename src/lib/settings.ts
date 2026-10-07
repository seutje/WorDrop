import { invoke } from "@tauri-apps/api/core";

export type ImageClassifier = "fashionclip" | "imajev";
export type AppSettings = {
  allowMultipleBottoms: boolean;
  classifier: ImageClassifier;
};

export function setImageClassifier(
  classifier: ImageClassifier,
): Promise<AppSettings> {
  return invoke("set_image_classifier", { classifier });
}

export function getAppSettings(): Promise<AppSettings> {
  return invoke("get_app_settings");
}

export function setAllowMultipleBottoms(allow: boolean): Promise<AppSettings> {
  return invoke("set_allow_multiple_bottoms", { allow });
}
