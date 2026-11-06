import type { TaskFormField, TaskSubmitValue } from "@/types/task";

export function validateRequiredFields(
  fields: TaskFormField[],
  values: Record<string, TaskSubmitValue>,
): string[] {
  return fields.flatMap((field) => {
    if (!field.required) return [];
    const value = values[field.key];
    const isEmpty =
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (typeof value === "object" && value.fileId.trim() === "");
    return isEmpty ? [`请填写${field.label}`] : [];
  });
}

export function areTaskFormValuesEqual(
  current: Record<string, TaskSubmitValue>,
  saved: Record<string, TaskSubmitValue>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(saved)]);
  return [...keys].every((key) => {
    const currentValue = current[key] ?? null;
    const savedValue = saved[key] ?? null;
    if (
      currentValue &&
      savedValue &&
      typeof currentValue === "object" &&
      typeof savedValue === "object"
    ) {
      return currentValue.fileId === savedValue.fileId;
    }
    return currentValue === savedValue;
  });
}
