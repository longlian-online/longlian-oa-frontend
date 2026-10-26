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

export interface ProjectCustomField {
  name: string;
  value: string;
}

export function parseProjectCustomFields(metadata?: string): ProjectCustomField[] {
  if (!metadata) return [];

  try {
    const parsed: unknown = JSON.parse(metadata);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      !("fields" in parsed) ||
      !Array.isArray(parsed.fields)
    ) {
      return [];
    }

    const fields: ProjectCustomField[] = [];
    for (const field of parsed.fields) {
      if (
        typeof field !== "object" ||
        field === null ||
        Array.isArray(field) ||
        !("name" in field) ||
        typeof field.name !== "string" ||
        field.name.trim() === "" ||
        !("value" in field) ||
        typeof field.value !== "string"
      ) {
        continue;
      }
      fields.push({ name: field.name, value: field.value });
    }
    return fields;
  } catch {
    return [];
  }
}

export function buildProjectMetadata(
  tags: ProjectMetadataTag[],
  fields: ProjectCustomField[],
): string {
  const savedFields = fields.flatMap((field) => {
    const name = field.name.trim();
    if (!name) return [];
    return [{ name, value: field.value.trim() }];
  });
  const metadata: { tags: ProjectMetadataTag[]; fields?: ProjectCustomField[] } = { tags };
  if (savedFields.length > 0) metadata.fields = savedFields;
  return JSON.stringify(metadata);
}
