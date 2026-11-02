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

export interface EditableProjectCustomField extends ProjectCustomField {
  id: string;
  presetFieldId?: string;
  required?: boolean;
  fromType?: boolean;
}

export interface ProjectTypeCustomFieldDefault {
  presetFieldId?: string | null;
  name: string;
  required: boolean;
}

export function missingRequiredFieldNames(
  fields: Array<Pick<ProjectCustomField, "name" | "value"> & { required?: boolean }>,
): string[] {
  const filled = new Set(
    fields.flatMap((field) => {
      const name = field.name.trim();
      return name && field.value.trim() ? [name] : [];
    }),
  );
  const missing: string[] = [];
  for (const field of fields) {
    const name = field.name.trim();
    if (!field.required || !name || filled.has(name) || missing.includes(name)) continue;
    missing.push(name);
  }
  return missing;
}

export function applyTypeCustomFields(
  current: EditableProjectCustomField[],
  defaults: ProjectTypeCustomFieldDefault[],
  mode: "all" | "required",
  createId: () => string = () => crypto.randomUUID(),
): EditableProjectCustomField[] {
  const remaining = defaults.map((item) => ({ ...item, name: item.name.trim() }));
  const kept: EditableProjectCustomField[] = [];

  for (const field of current) {
    if (field.fromType && !field.value.trim()) continue;
    const index = remaining.findIndex((item) => item.name === field.name.trim());
    if (index >= 0) {
      const match = remaining.splice(index, 1)[0]!;
      kept.push({
        ...field,
        name: match.name,
        presetFieldId: match.presetFieldId ?? undefined,
        required: match.required,
        fromType: true,
      });
    } else {
      kept.push({ ...field, required: false, fromType: false, presetFieldId: undefined });
    }
  }

  for (const item of mode === "all" ? remaining : remaining.filter((field) => field.required)) {
    kept.push({
      id: createId(),
      name: item.name,
      value: "",
      presetFieldId: item.presetFieldId ?? undefined,
      required: item.required,
      fromType: true,
    });
  }
  return kept;
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
