import type { DownloadDirectoryHandle, SavedDownloadDirectory } from "./downloadDirectory";

export interface DownloadSession {
  running: boolean;
  progress: { done: number; total: number } | null;
  directory: DownloadDirectoryHandle | null;
}

const EMPTY: DownloadSession = {
  running: false,
  progress: null,
  directory: null,
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

export function rememberDownloadDirectory(saved: SavedDownloadDirectory | null): void {
  if (current.running || !saved) return;
  publish({
    running: false,
    progress: null,
    directory: saved.handle,
  });
}

export function beginDownload(): void {
  publish({ ...current, running: true, progress: null });
}

export function noteDownloadProgress(done: number, total: number): void {
  publish({ ...current, progress: { done, total } });
}

export function finishDownload(): void {
  publish({ ...current, running: false, progress: null });
}

export function resetDownloadSession(): void {
  publish(EMPTY);
}
