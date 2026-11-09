import type { DownloadDirectoryHandle, SavedDownloads } from "./downloadDirectory";
import type { DownloadRecord } from "./fileDownload";
import type { OrgFileTree } from "./fileLocation";

export interface DownloadSession {
  running: boolean;
  progress: { done: number; total: number } | null;
  records: DownloadRecord[];
  directory: DownloadDirectoryHandle | null;
  directoryName: string | null;
  view: OrgFileTree;
}

const EMPTY: DownloadSession = {
  running: false,
  progress: null,
  records: [],
  directory: null,
  directoryName: null,
  view: "planning",
};

let current: DownloadSession = EMPTY;
const listeners = new Set<() => void>();

function publish(next: DownloadSession): void {
  current = next;
  for (const listener of listeners) listener();
}

export function subscribeDownloadSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDownloadSession(): DownloadSession {
  return current;
}

export function rememberDownloads(saved: SavedDownloads | null): void {
  if (current.running || !saved) return;
  publish({
    running: false,
    progress: null,
    records: saved.records,
    directory: saved.handle,
    directoryName: saved.name,
    view: saved.view,
  });
}

export function beginDownload(): void {
  publish({ ...current, running: true, progress: null });
}

export function noteDownloadDirectory(
  directory: DownloadDirectoryHandle,
  records: DownloadRecord[],
): void {
  publish({
    ...current,
    directory,
    directoryName: directory.name,
    records,
  });
}

export function noteDownloadProgress(records: DownloadRecord[], done: number, total: number): void {
  publish({ ...current, records, progress: { done, total } });
}

export function finishDownload(): void {
  publish({ ...current, running: false, progress: null });
}

export function resetDownloadSession(): void {
  publish({ ...EMPTY, records: [] });
}
