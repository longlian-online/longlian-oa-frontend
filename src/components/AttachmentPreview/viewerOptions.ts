import type { ViewerOptions } from "@file-viewer/react";
import litePreset from "@file-viewer/preset-lite";
import officePreset from "@file-viewer/preset-office";
import { archiveRenderer } from "@file-viewer/renderer-archive";

import { ARCHIVE_PREVIEW_LIMIT } from "./previewable";

const RENDERER_IDS = new Set([
  "file-viewer-renderer-pdf",
  "file-viewer-renderer-word",
  "file-viewer-renderer-spreadsheet",
  "file-viewer-renderer-presentation",
  "file-viewer-renderer-text",
  "file-viewer-renderer-image",
  "file-viewer-renderer-media",
  "file-viewer-renderer-archive",
]);

const EXTENSIONS_BY_DEFINITION: Record<string, readonly string[]> = {
  pdf: ["pdf"],
  "office-word-openxml": ["docx"],
  "office-word-binary": ["doc"],
  "spreadsheet-openxml": ["xlsx", "xls", "csv"],
  "office-presentation-binary": ["ppt"],
  "office-presentation": ["pptx"],
  image: ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp"],
  video: ["mp4", "webm"],
  audio: ["mp3", "wav", "ogg", "oga", "opus", "m4a", "aac", "flac", "weba"],
  code: ["txt"],
  archive: ["zip", "rar", "7z"],
};

interface PreviewRendererDefinition {
  id: string;
  extensions?: readonly string[];
}

interface PreviewRenderer {
  id: string;
  definitions?: readonly PreviewRendererDefinition[];
}

function limitRenderers<T extends PreviewRenderer>(renderers: readonly T[]): T[] {
  return renderers.flatMap((renderer) => {
    if (!RENDERER_IDS.has(renderer.id)) return [];
    const definitions = (renderer.definitions ?? [])
      .filter((definition) => EXTENSIONS_BY_DEFINITION[definition.id])
      .map((definition) => ({
        ...definition,
        extensions: (definition.extensions ?? []).filter((extension) =>
          EXTENSIONS_BY_DEFINITION[definition.id]?.includes(extension),
        ),
      }))
      .filter((definition) => definition.extensions.length > 0);
    if (definitions.length === 0) return [];
    return [{ ...renderer, definitions }];
  });
}

const renderers = limitRenderers([
  ...officePreset.renderers,
  ...litePreset.renderers,
  archiveRenderer,
]);

export function createPreviewOptions(theme: "light" | "dark"): ViewerOptions {
  return {
    theme,
    locale: "zh-CN",
    rendererMode: "replace",
    renderers: renderers as unknown as ViewerOptions["renderers"],
    styleIsolation: "shadow",
    toolbar: {
      position: "bottom-right",
      download: true,
      print: false,
      exportHtml: false,
      permissions: { print: false, "export-html": false },
    },
    beforeOperation: (context) =>
      context.operation !== "print" && context.operation !== "export-html",
    archive: {
      cache: false,
      maxArchiveSize: ARCHIVE_PREVIEW_LIMIT,
      maxEntryPreviewSize: ARCHIVE_PREVIEW_LIMIT,
      requestPassword: () => null,
    },
  };
}
