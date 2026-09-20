import { invoke } from "@tauri-apps/api/core";

export type AppSettings = { allowMultipleBottoms: boolean };

export function getAppSettings(): Promise<AppSettings> {
  return invoke("get_app_settings");
}

export function setAllowMultipleBottoms(allow: boolean): Promise<AppSettings> {
  return invoke("set_allow_multiple_bottoms", { allow });
}
