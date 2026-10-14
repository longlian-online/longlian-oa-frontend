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
  projectName: string;
  claimedAt: string;
  /** 仅 WAITING 桶返回 */
  waitingStageName?: string;
}

export interface MyTaskPage {
  list: MyTaskInstanceVO[];
  total: number;
}
