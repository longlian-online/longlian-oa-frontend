import type { ProjectStatus } from "@/types/planning";

/**
 * 将企划状态归一化为中文枚举值。
 * 后端 ProjectStatus 以 @JsonValue 序列化为中文描述，历史数据可能存在英文枚举名。
 */
export function getStatusLabel(status: ProjectStatus): ProjectStatus {
  if (status === "COMPLETED" || status === "已完成") return "已完成";
  if (status === "ARCHIVED" || status === "已归档") return "已归档";
  return "进行中";
}
