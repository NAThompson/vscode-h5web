import { type ExportFormat } from '@h5web/app';

export type Message =
  | { type: MessageType.Ready }
  | { type: MessageType.FileInfo; data: FileInfo }
  | { type: MessageType.Export; data: Export };

export enum MessageType {
  Ready = 'Ready',
  FileInfo = 'FileInfo',
  Export = 'Export',
}

export interface FileInfo {
  uri: string; // webview URI, to fetch whole file
  rangeUrl?: string; // range server URL, to read file lazily (local files only)
  name: string;
  exists: boolean; // `false` if file was deleted or moved
  size: number;
  mtime: number;
  wasm64: boolean; // whether 64-bit build of h5wasm may be used (if supported by webview)
}

export interface Export {
  format: ExportFormat;
  name: string;
  payload: string;
}
