import type { LucideIcon } from "lucide-react";

let cachedCatalog: Record<string, LucideIcon> | null = null;
let loadingCatalog: Promise<Record<string, LucideIcon>> | null = null;

/**
 * 按需加载全量 Lucide 图标目录。
 * 通过独立子路径导入，避免与入口静态按需导入的 `lucide-react` 合并进首屏预加载大包。
 */
export function loadLucideIconCatalog(): Promise<Record<string, LucideIcon>> {
  if (cachedCatalog) return Promise.resolve(cachedCatalog);
  loadingCatalog ??= import("lucide-react/dist/esm/icons/index.js").then((module) => {
    const entries = Object.entries(module as Record<string, unknown>).filter(
      ([name, value]) => name !== "default" && name !== "__esModule" && value != null,
    ) as Array<[string, LucideIcon]>;
    cachedCatalog = Object.fromEntries(entries);
    return cachedCatalog;
  });
  return loadingCatalog;
}
