import { invoke } from "@tauri-apps/api/core";

export type ClassifierStatus = {
  downloading: boolean;
  ready: boolean;
  downloadedBytes: number;
  totalBytes: number;
  message: string;
  error?: string | null;
};
export const getClassifierStatus = (): Promise<ClassifierStatus> =>
  invoke("get_classifier_status");
export const downloadImaJev = (): Promise<ClassifierStatus> =>
  invoke("download_imajev");
