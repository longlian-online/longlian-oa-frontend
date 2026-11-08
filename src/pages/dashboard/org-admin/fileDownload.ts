import type { OrgFileDownloadTarget, OrgFileEntryVO } from "@/types/organizationAdmin";

import type { OrgFileLocation } from "./fileLocation";

export interface DownloadRecord {
  taskInstanceId: string;
  fieldKey: string;
  fileId: string;
  name: string;
}

export interface DownloadNameSource {
  taskInstanceId: string;
  fieldKey: string;
  fileId: string;
  fileName: string;
}

const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
const MAX_NAME_LENGTH = 180;

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
): OrgFileDownloadTarget | null {
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

export function sanitizeFileName(name: string, fileId: string): string {
  const base = name.replaceAll("\\", "/").split("/").pop() ?? "";
  let cleaned = stripIllegal(base)
    .replace(/[. ]+$/g, "")
    .trim();
  if (!cleaned || cleaned === "." || cleaned === "..") cleaned = `file_${fileId}`;
  if (WINDOWS_DEVICE.test(cleaned)) {
    const dot = cleaned.lastIndexOf(".");
    const ext = dot > 0 ? cleaned.slice(dot) : "";
    const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned;
    cleaned = `${stem}_${fileId}${ext}`;
  }
  if (cleaned.length <= MAX_NAME_LENGTH) return cleaned;
  const dot = cleaned.lastIndexOf(".");
  const ext = dot > 0 && cleaned.length - dot <= 16 ? cleaned.slice(dot) : "";
  return `${cleaned.slice(0, MAX_NAME_LENGTH - ext.length)}${ext}`;
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

export function allocateFlatName(
  desired: string,
  fileId: string,
  reserved: ReadonlyMap<string, string>,
  ownKey: string,
): string {
  const cleaned = sanitizeFileName(desired, fileId);
  const owner = reserved.get(cleaned.toLowerCase());
  if (!owner || owner === ownKey) return cleaned;
  const dot = cleaned.lastIndexOf(".");
  const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned;
  const ext = dot > 0 ? cleaned.slice(dot) : "";
  let suffix = 0;
  while (suffix < 1000) {
    const candidate =
      suffix === 0 ? `${stem}_${fileId}${ext}` : `${stem}_${fileId}_${suffix}${ext}`;
    const takenBy = reserved.get(candidate.toLowerCase());
    if (!takenBy || takenBy === ownKey) {
      return candidate.length <= MAX_NAME_LENGTH ? candidate : `${fileId}${ext || ""}`;
    }
    suffix += 1;
  }
  return `${fileId}`;
}

export function assignFlatNames<T extends DownloadNameSource>(
  existing: DownloadRecord[],
  files: T[],
): Array<T & { localName: string }> {
  const reserved = new Map<string, string>();
  const existingByKey = new Map<string, DownloadRecord>();
  for (const record of existing) {
    const key = fileKey(record);
    existingByKey.set(key, record);
    reserved.set(record.name.toLowerCase(), key);
  }
  return files.map((file) => {
    const key = fileKey(file);
    const previous = existingByKey.get(key);
    if (previous) return { ...file, localName: previous.name };
    const localName = allocateFlatName(file.fileName, file.fileId, reserved, key);
    reserved.set(localName.toLowerCase(), key);
    return { ...file, localName };
  });
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
    records.push({
      taskInstanceId: record.taskInstanceId,
      fieldKey: record.fieldKey,
      fileId: record.fileId,
      name: record.name,
    });
  }
  return records;
}
