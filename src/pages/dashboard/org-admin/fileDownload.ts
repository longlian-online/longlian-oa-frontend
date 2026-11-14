import type {
  OrgFileBatchFileVO,
  OrgFileExpansionTarget,
  OrgFileEntryVO,
} from "@/types/organizationAdmin";

import type { OrgFileLeafView, OrgFileLocation } from "./fileLocation";

export function fileKey(file: {
  taskInstanceId: string;
  fieldKey: string;
  fileId: string;
}): string {
  return `${file.taskInstanceId}\u001f${file.fieldKey}\u001f${file.fileId}`;
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
  if (location.itemId || location.taskId) return null;
  if (!location.typeId) return { kind: "TYPE", typeId: entry.id };
  if (!location.projectId) return { kind: "PROJECT", projectId: entry.id };
  if (location.view === "task") {
    return { kind: "TASK", projectId: location.projectId, taskId: entry.id };
  }
  return { kind: "ITEM", itemId: entry.id };
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

function entryPaths(files: { fileId: string; name: string; directories: string[] }[]): string[] {
  const taken = new Set<string>();
  return files.map((file) => {
    const folders = file.directories.map(archiveFolderName);
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
  files: OrgFileBatchFileVO[],
  location: OrgFileLocation,
  view: OrgFileLeafView,
): string[] {
  const depth =
    location.itemId || location.taskId ? 3 : location.projectId ? 2 : location.typeId ? 1 : 0;
  return entryPaths(
    files.map((file) => ({
      fileId: file.fileId,
      name: file.fileName,
      directories: [
        file.typeName,
        file.projectTitle,
        view === "item" ? file.itemTitle : file.taskName,
      ]
        .slice(depth)
        .map((name) => name ?? ""),
    })),
  );
}

function archiveFolderName(name: string): string {
  const cleaned = stripIllegal(name)
    .replace(/[. ]+$/u, "")
    .trim();
  if (cleaned === "" || cleaned === "." || cleaned === "..") return "未命名";
  if (WINDOWS_DEVICE.test(cleaned)) return `${cleaned}_`;
  return cleaned;
}
