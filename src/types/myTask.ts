/** 我的待办分桶（依赖 BE #224：GET /app/task/instance/mine） */
export type MyTaskBucket = "SUBMITTABLE" | "WAITING";

/** ASC = 最早接取（默认），DESC = 最近接取 */
export type MyTaskSortDirection = "ASC" | "DESC";

export interface MyTaskListDTO {
  bucket: MyTaskBucket;
  pageNum?: number;
  pageSize?: number;
  sortDirection?: MyTaskSortDirection;
}

export interface MyTaskInstanceVO {
  instanceId: string;
  itemId: string;
  projectId: string;
  itemTitle: string;
  nodeName: string;
  stageSort: number;
  /** 本节点在所属阶段并行组中的位次，1 开始 */
  slotIndex?: number | null;
  /** 所属阶段的任务节点数 */
  slotTotal?: number | null;
  /** 同名跨阶段时的阶段位次；名称只出现在一个阶段时为空 */
  serialStep?: number | null;
  projectName: string;
  claimedAt: string;
  /** 仅 WAITING 桶返回 */
  waitingStageName?: string | null;
  waitingSlotIndex?: number | null;
  waitingSlotTotal?: number | null;
  waitingSerialStep?: number | null;
}

export interface MyTaskPage {
  list: MyTaskInstanceVO[];
  total: number;
}
