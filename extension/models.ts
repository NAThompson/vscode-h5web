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
  size: number;
  mtime: number;
}

export interface Export {
  format: ExportFormat;
  name: string;
  payload: string;
}
