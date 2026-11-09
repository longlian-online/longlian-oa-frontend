import type { OrgFileExpansionTarget, OrgFileEntryVO } from "@/types/organizationAdmin";

import type { OrgFileLocation } from "./fileLocation";

export interface DownloadRecord {
  taskInstanceId: string;
  fieldKey: string;
  fileId: string;
  name: string;
  path?: string;
}

export function fileKey(file: {
  taskInstanceId: string;
  fieldKey: string;
  fileId: string;
}): string {
  return `${file.taskInstanceId}\u001f${file.fieldKey}\u001f${file.fileId}`;
}

export function isDownloaded(
  records: DownloadRecord[],
  entry: Pick<OrgFileEntryVO, "kind" | "taskInstanceId" | "fieldKey" | "fileId">,
): boolean {
  if (entry.kind !== "FILE" || !entry.taskInstanceId || !entry.fieldKey || !entry.fileId)
    return false;
  const key = fileKey({
    taskInstanceId: entry.taskInstanceId,
    fieldKey: entry.fieldKey,
    fileId: entry.fileId,
  });
  return records.some((record) => fileKey(record) === key);
}

export function downloadTarget(
  entry: Pick<
    OrgFileEntryVO,
    "id" | "kind" | "taskInstanceId" | "fileId" | "fieldKey" | "availability"
  >,
  location: OrgFileLocation,
): OrgFileExpansionTarget | null {
  if (entry.kind === "FILE") {
    if (
      entry.availability !== "available" ||
      !entry.taskInstanceId ||
      !entry.fileId ||
      !entry.fieldKey
    ) {
      return null;
    }
    return {
      kind: "FILE",
      taskInstanceId: entry.taskInstanceId,
      fileId: entry.fileId,
      fieldKey: entry.fieldKey,
    };
  }
  if (location.itemId) return null;
  if (location.tree === "type") {
    return location.typeId ? null : { kind: "TYPE", typeId: entry.id };
  }
  if (location.tree === "item" || location.projectId) return { kind: "ITEM", itemId: entry.id };
  return { kind: "PROJECT", projectId: entry.id };
}

export function resourceFileName(fileId: string, originalName: string): string {
  const base = originalName.replaceAll("\\", "/").split("/").pop() ?? "";
  const cleaned = stripIllegal(base);
  const dot = cleaned.lastIndexOf(".");
  const extension = dot >= 0 ? cleaned.slice(dot + 1) : "";
  if (/^[A-Za-z0-9]{1,16}$/.test(extension)) return `${fileId}.${extension}`;
  return fileId;
}

function stripIllegal(name: string): string {
  let result = "";
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 || '<>:"/\\|?*'.includes(char)) continue;
    result += char;
  }
  return result;
}

const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

function archiveBaseName(originalName: string, fileId: string): string {
  const base = originalName.replaceAll("\\", "/").split("/").pop() ?? "";
  const cleaned = stripIllegal(base)
    .replace(/[. ]+$/u, "")
    .trim();
  if (cleaned === "" || cleaned === "." || cleaned === "..") return fileId;
  return cleaned;
}

function withResourceId(name: string, fileId: string): string {
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1) : "";
  if (/^[A-Za-z0-9]{1,16}$/.test(extension)) return `${name.slice(0, dot)}_${fileId}.${extension}`;
  return `${name}_${fileId}`;
}

export function archiveEntryPaths(
  files: { fileId: string; name: string; directories?: string[] }[],
  reserved: readonly string[] = [],
): string[] {
  const taken = new Set(reserved.map((path) => path.toLowerCase()));
  return files.map((file) => {
    const folders = (file.directories ?? []).map(archiveFolderName);
    const base = archiveBaseName(file.name, file.fileId);
    let entry = WINDOWS_DEVICE.test(base) ? withResourceId(base, file.fileId) : base;
    const pathKey = (): string => [...folders, entry].join("/").toLowerCase();
    if (taken.has(pathKey())) entry = withResourceId(base, file.fileId);
    let sequence = 2;
    while (taken.has(pathKey())) {
      entry = withResourceId(base, `${file.fileId}-${sequence}`);
      sequence += 1;
    }
    const path = [...folders, entry].join("/");
    taken.add(path.toLowerCase());
    return path;
  });
}

export function downloadRelativePaths(
  files: {
    fileId: string;
    name: string;
    projectTitle?: string | null;
    itemTitle?: string | null;
    taskName?: string | null;
    fieldLabel?: string | null;
  }[],
  reserved: readonly string[] = [],
): string[] {
  return archiveEntryPaths(
    files.map((file) => ({
      fileId: file.fileId,
      name: storedFileName(file),
    })),
    reserved,
  );
}

function storedFileName(file: {
  name: string;
  projectTitle?: string | null;
  itemTitle?: string | null;
  taskName?: string | null;
  fieldLabel?: string | null;
}): string {
  const base = [file.projectTitle, file.itemTitle, file.taskName, file.fieldLabel]
    .map((part) => archiveFolderName(part ?? ""))
    .join("-");
  const extension = fileExtension(file.name);
  return extension ? `${base}.${extension}` : base;
}

function fileExtension(originalName: string): string {
  const base = originalName.replaceAll("\\", "/").split("/").pop() ?? "";
  const cleaned = stripIllegal(base);
  const dot = cleaned.lastIndexOf(".");
  const extension = dot >= 0 ? cleaned.slice(dot + 1) : "";
  return /^[A-Za-z0-9]{1,16}$/.test(extension) ? extension : "";
}

export function storedPath(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "" || value.startsWith("/") || value.includes("\\")) {
    return undefined;
  }
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return undefined;
  return value;
}

function archiveFolderName(name: string): string {
  const cleaned = stripIllegal(name)
    .replace(/[. ]+$/u, "")
    .trim();
  if (cleaned === "" || cleaned === "." || cleaned === "..") return "未命名";
  if (WINDOWS_DEVICE.test(cleaned)) return `${cleaned}_`;
  return cleaned;
}

export function serializeManifest(records: DownloadRecord[]): string {
  return JSON.stringify({ version: 1, files: records });
}

export function parseManifest(text: string): DownloadRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const body = parsed as { version?: unknown; files?: unknown };
  if (body.version !== 1 || !Array.isArray(body.files)) return [];
  const records: DownloadRecord[] = [];
  for (const item of body.files) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.taskInstanceId !== "string" ||
      typeof record.fieldKey !== "string" ||
      typeof record.fileId !== "string" ||
      typeof record.name !== "string" ||
      !record.taskInstanceId ||
      !record.fieldKey ||
      !record.fileId ||
      !record.name
    ) {
      continue;
    }
    const path = storedPath(record.path);
    records.push({
      taskInstanceId: record.taskInstanceId,
      fieldKey: record.fieldKey,
      fileId: record.fileId,
      name: record.name,
      ...(path ? { path } : {}),
    });
  }
  return records;
}
