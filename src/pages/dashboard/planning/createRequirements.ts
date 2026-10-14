export function projectCreateMissingLabel(input: {
  title: string;
  typeId: string;
  hasCover: boolean;
  isEditing: boolean;
}): string | null {
  const missing: string[] = [];
  if (!input.title.trim()) missing.push("企划名");
  if (!input.typeId) missing.push("类型");
  if (!input.isEditing && !input.hasCover) missing.push("封面");
  if (missing.length === 0) return null;
  if (missing.length === 1) return `还需要${missing[0]}`;
  return `还需要${missing.slice(0, -1).join("、")}和${missing[missing.length - 1]}`;
}
