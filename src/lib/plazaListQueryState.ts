import { DEFAULT_PLAZA_SORT } from "@/queries/planning";

export const plazaListDefaults = {
  keyword: "",
  projectType: "all",
  taskType: "all",
  sortBy: DEFAULT_PLAZA_SORT as string,
  stageScope: "ALL",
};
export const plazaListChoices = {
  sortBy: ["WAIT", "LATEST", "MOST"],
  stageScope: ["ALL", "CURRENT"],
};

export function plazaTaskPageKey(projectId: string): string {
  return `taskPage_${projectId}`;
}

export function plazaPageKeys(params: URLSearchParams): string[] {
  return ["page", ...Array.from(params.keys()).filter((key) => key.startsWith("taskPage_"))];
}
