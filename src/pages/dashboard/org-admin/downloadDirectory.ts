import type { OrgFileBatchFileVO } from "@/types/organizationAdmin";

import { downloadRelativePaths } from "./fileDownload";
import type { OrgFileLeafView, OrgFileLocation } from "./fileLocation";

const DB_NAME = "longlian-oa-files";
const STORE = "handles";
const WRITE_CONCURRENCY = 3;
const BATCH_LOCK = "longlian-oa-download-batch";

interface BatchLockManager {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

let batchChain = Promise.resolve();

function withBatchLock<T>(task: () => Promise<T>): Promise<T> {
  const locks =
    typeof navigator === "undefined"
      ? undefined
      : (navigator as Navigator & { locks?: BatchLockManager }).locks;
  if (locks) return locks.request(BATCH_LOCK, task);
  const run = batchChain.then(task, task);
  batchChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export class DirectoryAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectoryAccessError";
  }
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

// 工程 lib 停在 ES2023，目录选择器所在的浏览器已经提供 Promise.withResolvers。
const PromiseWithResolvers = Promise as unknown as {
  withResolvers<T>(): Deferred<T>;
};

function deferred<T>(): Deferred<T> {
  return PromiseWithResolvers.withResolvers<T>();
}

interface DownloadFileHandle {
  createWritable(): Promise<WritableStream<Uint8Array>>;
}

export interface DownloadDirectoryHandle {
  readonly name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<DownloadFileHandle>;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<DownloadDirectoryHandle>;
  queryPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
}

export interface SavedDownloadDirectory {
  handle: DownloadDirectoryHandle | null;
  name: string | null;
}

function isDirectoryHandle(value: unknown): value is DownloadDirectoryHandle {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value) || typeof value.name !== "string") return false;
  if (!("getFileHandle" in value) || typeof value.getFileHandle !== "function") return false;
  return "getDirectoryHandle" in value && typeof value.getDirectoryHandle === "function";
}

function openDb(): Promise<IDBDatabase> {
  const { promise, resolve, reject } = deferred<IDBDatabase>();
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("无法打开下载目录记录"));
  return promise;
}

async function permission(handle: DownloadDirectoryHandle): Promise<PermissionState> {
  if (typeof handle.queryPermission !== "function") return "prompt";
  return handle.queryPermission({ mode: "readwrite" });
}

function orgStorageKey(orgId: string): string {
  return `org:${orgId}`;
}

interface StoredOrgDownload {
  handle: DownloadDirectoryHandle | null;
}

function isStoredOrgDownload(value: unknown): value is StoredOrgDownload {
  if (!value || typeof value !== "object") return false;
  const stored = value as { handle?: unknown };
  if (!("handle" in stored)) return false;
  if (stored.handle == null) return true;
  return isDirectoryHandle(stored.handle);
}

async function readStored(key: string): Promise<unknown> {
  const db = await openDb();
  const { promise, resolve, reject } = deferred<unknown>();
  const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("无法读取下载设置"));
  try {
    return await promise;
  } finally {
    db.close();
  }
}

async function writeStored(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  const { promise, resolve, reject } = deferred<void>();
  const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error ?? new Error("无法保存下载设置"));
  try {
    await promise;
  } finally {
    db.close();
  }
}

async function readOrgDownload(orgId: string): Promise<StoredOrgDownload | null> {
  const stored = await readStored(orgStorageKey(orgId));
  return isStoredOrgDownload(stored) ? stored : null;
}

function savedDirectory(handle: DownloadDirectoryHandle | null): SavedDownloadDirectory {
  return { handle, name: handle?.name ?? null };
}

export async function loadOrgDirectory(orgId: string): Promise<SavedDownloadDirectory> {
  try {
    return savedDirectory((await readOrgDownload(orgId))?.handle ?? null);
  } catch {
    return savedDirectory(null);
  }
}

export async function saveOrgDirectory(
  orgId: string,
  handle: DownloadDirectoryHandle,
): Promise<SavedDownloadDirectory> {
  const stored = { handle };
  await writeStored(orgStorageKey(orgId), stored);
  return savedDirectory(handle);
}

export async function pickDownloadDirectory(): Promise<DownloadDirectoryHandle> {
  if (!("showDirectoryPicker" in window) || typeof window.showDirectoryPicker !== "function") {
    throw new DirectoryAccessError("当前浏览器不能选择下载文件夹，请使用 Chrome 或 Edge");
  }
  const handle: unknown = await window.showDirectoryPicker({
    mode: "readwrite",
    id: "longlian-oa-downloads",
  });
  if (!isDirectoryHandle(handle)) {
    throw new DirectoryAccessError("没有拿到可写入的文件夹");
  }
  return handle;
}

export async function ensureWritePermission(handle: DownloadDirectoryHandle): Promise<boolean> {
  if ((await permission(handle)) === "granted") return true;
  if (typeof handle.requestPermission !== "function") return false;
  return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
}

function splitRelative(path: string): { directories: string[]; name: string } {
  const parts = path.split("/");
  const name = parts.pop() ?? path;
  return { directories: parts, name };
}

async function directoryAt(
  root: DownloadDirectoryHandle,
  directories: string[],
): Promise<DownloadDirectoryHandle> {
  let current = root;
  for (const name of directories) {
    if (typeof current.getDirectoryHandle !== "function") {
      throw new DirectoryAccessError("当前浏览器不能在下载文件夹里建立子目录");
    }
    current = await current.getDirectoryHandle(name, { create: true });
  }
  return current;
}

async function createBatchDirectory(
  root: DownloadDirectoryHandle,
): Promise<DownloadDirectoryHandle> {
  const now = new Date();
  const pad = (value: number, width = 2): string => String(value).padStart(width, "0");
  const name = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
  return withBatchLock(async () => {
    for (let suffix = 1; ; suffix += 1) {
      const candidate = suffix === 1 ? name : `${name}_${suffix}`;
      try {
        await root.getDirectoryHandle(candidate);
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") {
          return root.getDirectoryHandle(candidate, { create: true });
        }
        if (!(error instanceof DOMException && error.name === "TypeMismatchError")) throw error;
      }
    }
  });
}

async function writeDownloadFile(
  directory: DownloadDirectoryHandle,
  name: string,
  body: ReadableStream<Uint8Array>,
): Promise<void> {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    await body.pipeTo(writable);
  } catch (error) {
    await writable.abort().catch(() => undefined);
    throw error;
  }
}

async function fetchBody(url: string): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error("下载失败");
  return response.body;
}

export async function saveDownloadedFiles(
  directory: DownloadDirectoryHandle,
  files: OrgFileBatchFileVO[],
  location: OrgFileLocation,
  view: OrgFileLeafView,
  sign: (file: OrgFileBatchFileVO) => Promise<string>,
  onUpdate: (done: number, total: number) => void,
): Promise<number> {
  if (files.length === 0) return 0;
  const batchDirectory = await createBatchDirectory(directory);
  const paths = downloadRelativePaths(files, location, view);
  const jobs = files.map((file, index) => ({ file, path: paths[index] ?? file.fileId }));
  let failed = 0;
  let done = 0;

  async function one(job: { file: OrgFileBatchFileVO; path: string }): Promise<void> {
    const { file, path } = job;
    try {
      let body: ReadableStream<Uint8Array>;
      try {
        body = await fetchBody(await sign(file));
      } catch {
        body = await fetchBody(await sign(file));
      }
      const located = splitRelative(path);
      const folder = await directoryAt(batchDirectory, located.directories);
      await writeDownloadFile(folder, located.name, body);
    } catch {
      failed += 1;
    } finally {
      done += 1;
      onUpdate(done, files.length);
    }
  }

  onUpdate(0, files.length);
  await runPool(jobs, WRITE_CONCURRENCY, one);
  return failed;
}

async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      if (item === undefined) return;
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
}
