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
  if (values.content.trim().length > 4000) return "更新说明最多 4000 字";
  if (!publish) return null;
  if (!values.title.trim()) return "标题不能为空";
  if (!values.summary.trim()) return "摘要不能为空";
  if (!values.content.trim()) return "更新说明不能为空";
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
    content: values.content.trim(),
    publish,
  };
}
