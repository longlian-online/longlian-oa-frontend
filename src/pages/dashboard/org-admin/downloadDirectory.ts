import {
  downloadRelativePaths,
  fileKey,
  parseManifest,
  resourceFileName,
  serializeManifest,
  type DownloadRecord,
} from "./fileDownload";

const DB_NAME = "longlian-oa-files";
const STORE = "handles";
const DIRECTORY_KEY = "download-directory";
const MANIFEST_NAME = ".downloads.json";
const WRITE_CONCURRENCY = 3;
const MANIFEST_LOCK = "longlian-oa-download-manifest";

interface ManifestLockManager {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

let manifestChain = Promise.resolve();

function manifestLocks(): ManifestLockManager | null {
  if (typeof navigator === "undefined") return null;
  const locks = (navigator as Navigator & { locks?: ManifestLockManager }).locks;
  if (!locks || typeof locks.request !== "function") return null;
  return locks;
}

function withManifestLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = manifestLocks();
  if (locks) return locks.request(MANIFEST_LOCK, task);
  const run = manifestChain.then(task, task);
  manifestChain = run.then(
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

interface DownloadWritable extends WritableStream<Uint8Array> {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

interface DownloadFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<DownloadWritable>;
}

export interface DownloadDirectoryHandle {
  readonly name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<DownloadFileHandle>;
  getDirectoryHandle?(
    name: string,
    options?: { create?: boolean },
  ): Promise<DownloadDirectoryHandle>;
  removeEntry?(name: string): Promise<void>;
  queryPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
}

export interface SavedDownloads {
  handle: DownloadDirectoryHandle | null;
  name: string | null;
  records: DownloadRecord[];
}

export interface SavedDownloadFile {
  taskInstanceId: string;
  fieldKey: string;
  fileId: string;
  fileName: string;
  typeName?: string | null;
  projectTitle?: string | null;
  itemTitle?: string | null;
  taskName?: string | null;
  fieldLabel?: string | null;
}

function isDirectoryHandle(value: unknown): value is DownloadDirectoryHandle {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value) || typeof value.name !== "string") return false;
  if (!("getFileHandle" in value) || typeof value.getFileHandle !== "function") return false;
  return "queryPermission" in value && typeof value.queryPermission === "function";
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

async function readHandle(): Promise<DownloadDirectoryHandle | null> {
  const db = await openDb();
  const { promise, resolve, reject } = deferred<DownloadDirectoryHandle | null>();
  const request = db.transaction(STORE, "readonly").objectStore(STORE).get(DIRECTORY_KEY);
  request.onsuccess = () => resolve(isDirectoryHandle(request.result) ? request.result : null);
  request.onerror = () => reject(request.error ?? new Error("无法读取下载目录"));
  try {
    return await promise;
  } finally {
    db.close();
  }
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

async function deleteStored(key: string): Promise<void> {
  const db = await openDb();
  const { promise, resolve, reject } = deferred<void>();
  const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error ?? new Error("无法删除下载设置"));
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

function emptyDownloads(): SavedDownloads {
  return { handle: null, name: null, records: [] };
}

async function downloadsFromStored(stored: StoredOrgDownload): Promise<SavedDownloads> {
  if (!stored.handle) return emptyDownloads();
  if ((await permission(stored.handle)) !== "granted") {
    return { handle: stored.handle, name: stored.handle.name, records: [] };
  }
  return {
    handle: stored.handle,
    name: stored.handle.name,
    records: await readDownloadRecords(stored.handle),
  };
}

export async function loadOrgDownloads(orgId: string): Promise<SavedDownloads> {
  try {
    let stored = await readOrgDownload(orgId);
    if (!stored) {
      const legacy = await readHandle();
      if (legacy) {
        stored = { handle: legacy };
        await writeStored(orgStorageKey(orgId), stored);
        await deleteStored(DIRECTORY_KEY);
      }
    }
    if (!stored) return emptyDownloads();
    return await downloadsFromStored(stored);
  } catch {
    return emptyDownloads();
  }
}

export async function saveOrgDirectory(
  orgId: string,
  handle: DownloadDirectoryHandle,
): Promise<SavedDownloads> {
  const stored = { handle };
  await writeStored(orgStorageKey(orgId), stored);
  return downloadsFromStored(stored);
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

export async function readDownloadRecords(
  handle: DownloadDirectoryHandle,
): Promise<DownloadRecord[]> {
  try {
    const fileHandle = await handle.getFileHandle(MANIFEST_NAME);
    return parseManifest(await (await fileHandle.getFile()).text());
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return [];
    throw error;
  }
}

export async function writeDownloadRecords(
  handle: DownloadDirectoryHandle,
  records: DownloadRecord[],
): Promise<void> {
  const fileHandle = await handle.getFileHandle(MANIFEST_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(serializeManifest(records));
  await writable.close();
}

function splitRelative(path: string): { directories: string[]; name: string } {
  const parts = path.split("/");
  const name = parts.pop() ?? path;
  return { directories: parts, name };
}

async function directoryAt(
  root: DownloadDirectoryHandle,
  directories: string[],
  create: boolean,
): Promise<DownloadDirectoryHandle> {
  let current = root;
  for (const name of directories) {
    if (typeof current.getDirectoryHandle !== "function") {
      throw new DirectoryAccessError("当前浏览器不能在下载文件夹里建立子目录");
    }
    current = await current.getDirectoryHandle(name, create ? { create: true } : undefined);
  }
  return current;
}

async function removeRelative(root: DownloadDirectoryHandle, path: string): Promise<void> {
  const located = splitRelative(path);
  const directory = await directoryAt(root, located.directories, false);
  if (typeof directory.removeEntry !== "function") {
    throw new DirectoryAccessError("当前浏览器不能删除已下载的文件");
  }
  await directory.removeEntry(located.name);
}

export async function removeDownloadedFiles(
  directory: DownloadDirectoryHandle,
  files: Array<Pick<DownloadRecord, "taskInstanceId" | "fieldKey" | "fileId">>,
): Promise<DownloadRecord[]> {
  return withManifestLock(async () => {
    const records = await readDownloadRecords(directory);
    const keys = new Set(files.map((file) => fileKey(file)));
    const removing = records.filter((record) => keys.has(fileKey(record)));
    if (removing.length === 0) return records;
    const removed = new Set<string>();
    let failure: unknown;
    for (const record of removing) {
      try {
        if (record.path) await removeRelative(directory, record.path);
        else if (typeof directory.removeEntry !== "function") {
          throw new DirectoryAccessError("当前浏览器不能删除已下载的文件");
        } else {
          await directory.removeEntry(resourceFileName(record.fileId, record.name));
        }
        removed.add(fileKey(record));
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") {
          removed.add(fileKey(record));
          continue;
        }
        failure = error;
        break;
      }
    }
    const next = records.filter((record) => !removed.has(fileKey(record)));
    if (removed.size > 0) await writeDownloadRecords(directory, next);
    if (failure) throw failure;
    return next;
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
  existing: DownloadRecord[],
  files: SavedDownloadFile[],
  sign: (file: SavedDownloadFile) => Promise<string>,
  onUpdate: (records: DownloadRecord[], done: number, total: number) => void,
): Promise<number> {
  const replacing = new Set(files.map((file) => fileKey(file)));
  const reserved = existing.flatMap((record) =>
    record.path && !replacing.has(fileKey(record)) ? [record.path] : [],
  );
  const paths = downloadRelativePaths(
    files.map((file) => ({
      fileId: file.fileId,
      name: file.fileName,
      projectTitle: file.projectTitle,
      itemTitle: file.itemTitle,
      taskName: file.taskName,
      fieldLabel: file.fieldLabel,
    })),
    reserved,
  );
  const jobs = files.map((file, index) => ({ file, path: paths[index] ?? file.fileId }));
  let failed = 0;
  let done = 0;
  let latest = [...existing];

  async function one(job: { file: SavedDownloadFile; path: string }): Promise<void> {
    const { file, path } = job;
    try {
      let body: ReadableStream<Uint8Array>;
      try {
        body = await fetchBody(await sign(file));
      } catch {
        body = await fetchBody(await sign(file));
      }
      const located = splitRelative(path);
      const folder = await directoryAt(directory, located.directories, true);
      await writeDownloadFile(folder, located.name, body);
      await withManifestLock(async () => {
        const records = await readDownloadRecords(directory);
        const next = {
          taskInstanceId: file.taskInstanceId,
          fieldKey: file.fieldKey,
          fileId: file.fileId,
          name: file.fileName,
          path,
        };
        const key = fileKey(next);
        const index = records.findIndex((record) => fileKey(record) === key);
        const previous = index >= 0 ? records[index] : undefined;
        if (index >= 0) records[index] = next;
        else records.push(next);
        await writeDownloadRecords(directory, records);
        if (previous?.path && previous.path !== path) {
          try {
            await removeRelative(directory, previous.path);
          } catch (error) {
            if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
          }
        }
        latest = records;
        onUpdate([...latest], done, files.length);
      });
    } catch {
      failed += 1;
    } finally {
      done += 1;
      onUpdate([...latest], done, files.length);
    }
  }

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
