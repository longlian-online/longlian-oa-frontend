export const PROJECT_METADATA_TAG_COLORS = ["blue", "green", "amber", "rose", "violet"] as const;

export type ProjectMetadataTagColor = (typeof PROJECT_METADATA_TAG_COLORS)[number];

export interface ProjectMetadataTag {
  key: string;
  value: string;
  color?: ProjectMetadataTagColor;
}

export function normalizeProjectMetadataTagColor(
  color: unknown,
): ProjectMetadataTagColor | undefined {
  switch (color) {
    case "blue":
    case "green":
    case "amber":
    case "rose":
    case "violet":
      return color;
    default:
      return undefined;
  }
}

export function parseProjectMetadataTags(metadata?: string): ProjectMetadataTag[] {
  if (!metadata) return [];

  try {
    const parsed: unknown = JSON.parse(metadata);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      !("tags" in parsed) ||
      !Array.isArray(parsed.tags)
    ) {
      return [];
    }

    const tags: ProjectMetadataTag[] = [];
    for (const tag of parsed.tags) {
      if (
        typeof tag !== "object" ||
        tag === null ||
        Array.isArray(tag) ||
        !("key" in tag) ||
        typeof tag.key !== "string" ||
        tag.key.trim() === "" ||
        ("value" in tag && typeof tag.value !== "string")
      ) {
        continue;
      }

      const normalizedTag: ProjectMetadataTag = {
        key: tag.key,
        value: "value" in tag ? tag.value : "",
      };
      const color = normalizeProjectMetadataTagColor("color" in tag ? tag.color : undefined);
      if (color !== undefined) normalizedTag.color = color;
      tags.push(normalizedTag);
    }
    return tags;
  } catch {
    return [];
  }
}
