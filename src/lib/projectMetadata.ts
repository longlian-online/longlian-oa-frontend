export interface ProjectMetadataTag {
  key: string;
  value: string;
}

export function parseProjectMetadataTags(metadata?: string): ProjectMetadataTag[] {
  if (!metadata) return [];

  try {
    const parsed = JSON.parse(metadata) as { tags?: unknown };
    if (!Array.isArray(parsed.tags)) return [];

    return parsed.tags.filter(
      (tag): tag is ProjectMetadataTag =>
        typeof tag === "object" &&
        tag !== null &&
        "key" in tag &&
        "value" in tag &&
        typeof tag.key === "string" &&
        typeof tag.value === "string",
    );
  } catch {
    return [];
  }
}
