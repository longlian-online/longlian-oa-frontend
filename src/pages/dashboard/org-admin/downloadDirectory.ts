import { fileKey, parseManifest, serializeManifest, type DownloadRecord } from "./fileDownload";

const DB_NAME = "longlian-oa-files";
const STORE = "handles";
const DIRECTORY_KEY = "download-directory";
const MANIFEST_NAME = ".downloads.json";
const WRITE_CONCURRENCY = 3;

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
  queryPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
}

export interface SavedDownloads {
  handle: DownloadDirectoryHandle;
  name: string;
  records: DownloadRecord[];
}

export interface SavedDownloadFile {
  taskInstanceId: string;
  fieldKey: string;
  fileId: string;
  localName: string;
  readUrl: string;
  expireAt: number;
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

async function writeHandle(handle: DownloadDirectoryHandle): Promise<void> {
  const db = await openDb();
  const { promise, resolve, reject } = deferred<void>();
  const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(handle, DIRECTORY_KEY);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error ?? new Error("无法记住下载目录"));
  try {
    await promise;
  } finally {
    db.close();
  }
}

async function permission(handle: DownloadDirectoryHandle): Promise<PermissionState> {
  if (typeof handle.queryPermission !== "function") return "prompt";
  return handle.queryPermission({ mode: "readwrite" });
}

export async function loadSavedDownloads(): Promise<SavedDownloads | null> {
  try {
    const handle = await readHandle();
    if (!handle) return null;
    if ((await permission(handle)) !== "granted") {
      return { handle, name: handle.name, records: [] };
    }
    return { handle, name: handle.name, records: await readDownloadRecords(handle) };
  } catch {
    return null;
  }
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
  await writeHandle(handle);
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
  resign: (file: SavedDownloadFile) => Promise<string>,
  onUpdate: (records: DownloadRecord[], done: number, total: number) => void,
): Promise<number> {
  const records = [...existing];
  let failed = 0;
  let done = 0;
  let chain = Promise.resolve();
  const enqueue = (task: () => Promise<void>): Promise<void> => {
    const run = chain.then(task, task);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  async function one(file: SavedDownloadFile): Promise<void> {
    const key = fileKey(file);
    try {
      let url = file.readUrl;
      if (file.expireAt - Date.now() / 1000 < 60) url = await resign(file);
      let body: ReadableStream<Uint8Array>;
      try {
        body = await fetchBody(url);
      } catch {
        body = await fetchBody(await resign(file));
      }
      await writeDownloadFile(directory, file.localName, body);
      await enqueue(async () => {
        const next = {
          taskInstanceId: file.taskInstanceId,
          fieldKey: file.fieldKey,
          fileId: file.fileId,
          name: file.localName,
        };
        const index = records.findIndex((record) => fileKey(record) === key);
        if (index >= 0) records[index] = next;
        else records.push(next);
        await writeDownloadRecords(directory, records);
        onUpdate([...records], done, files.length);
      });
    } catch {
      failed += 1;
      await enqueue(async () => {
        const index = records.findIndex((record) => fileKey(record) === key);
        if (index < 0) return;
        records.splice(index, 1);
        await writeDownloadRecords(directory, records);
        onUpdate([...records], done, files.length);
      });
    } finally {
      done += 1;
      onUpdate([...records], done, files.length);
    }
  }

  await runPool(files, WRITE_CONCURRENCY, one);
  await chain;
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
