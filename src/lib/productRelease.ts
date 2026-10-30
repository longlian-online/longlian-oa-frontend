import type {
  ProductReleaseFormValues,
  ProductReleaseSaveDTO,
  ProductReleaseStatus,
} from "@/types/productRelease";

const VERSION = /^(0|[1-9]\d{0,6})\.(0|[1-9]\d{0,6})\.(0|[1-9]\d{0,6})$/;

export function formatProductVersion(value?: string | null): string {
  const version = value?.trim() ?? "";
  if (!version) return "";
  return version.startsWith("v") || version.startsWith("V")
    ? `v${version.slice(1)}`
    : `v${version}`;
}

export function formatReleaseTime(value?: string | null): string {
  if (!value) return "";
  const matched = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(value);
  return matched ? `${matched[1]} ${matched[2]}` : value;
}

export function normalizeVersionInput(value: string): string {
  return value.trim().replace(/^[vV]/, "");
}

export function parseChangeLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function statusLabel(status: ProductReleaseStatus): string {
  if (status === "PUBLISHED") return "已发布";
  if (status === "WITHDRAWN") return "已撤回";
  return "草稿";
}

export function validateProductRelease(
  values: ProductReleaseFormValues,
  publish: boolean,
): string | null {
  const versions = [
    ["产品版本", values.version],
    ["前端版本", values.frontendVersion],
    ["后端版本", values.backendVersion],
  ] as const;
  for (const [label, value] of versions) {
    const normalized = normalizeVersionInput(value);
    if (!normalized) return `${label}不能为空`;
    if (!VERSION.test(normalized)) return "版本格式不正确";
  }
  if (!publish) return null;
  if (!values.title.trim()) return "标题不能为空";
  if (!values.summary.trim()) return "摘要不能为空";
  const count =
    parseChangeLines(values.added).length +
    parseChangeLines(values.changed).length +
    parseChangeLines(values.fixed).length;
  if (count === 0) return "至少写一条变更";
  return null;
}

export function toProductReleasePayload(
  values: ProductReleaseFormValues,
  publish = false,
): ProductReleaseSaveDTO {
  return {
    version: normalizeVersionInput(values.version),
    frontendVersion: normalizeVersionInput(values.frontendVersion),
    backendVersion: normalizeVersionInput(values.backendVersion),
    title: values.title.trim(),
    summary: values.summary.trim(),
    added: parseChangeLines(values.added),
    changed: parseChangeLines(values.changed),
    fixed: parseChangeLines(values.fixed),
    publish,
  };
}
