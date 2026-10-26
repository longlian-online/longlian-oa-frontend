export type PlazaSortBy = "WAIT" | "LATEST" | "MOST";
export type PlazaStageScope = "ALL" | "CURRENT";

/** 任务大厅单条缺人任务 */
export interface PlazaTask {
  instanceId: string;
  itemId: string;
  itemTitle: string;
  nodeName: string;
  isCurrentStage: boolean;
  /** 任务所属阶段序号（1 开始） */
  stageIndex: number;
  /** 任务流总阶段数 */
  stageTotal: number;
  /** 任务所属阶段并行槽总数 */
  parallelTotal: number;
  /** 已被占用的并行槽数（已接取或已完成） */
  filledSlots: number;
  pendingSlots: number;
  /** 本节点在所属阶段并行组中的位次，1 开始 */
  slotIndex?: number | null;
  /** 所属阶段的任务节点数 */
  slotTotal?: number | null;
  /** 同名跨阶段时的阶段位次；名称只出现在一个阶段时为空 */
  serialStep?: number | null;
  /** 任务创建时间 "yyyy-MM-dd HH:mm:ss"（服务器本地时间） */
  createdAt: string;
}

/** 任务大厅按企划分组 */
export interface PlazaProjectGroup {
  projectId: string;
  title: string;
  typeName: string;
  coverUrl: string | null;
  thumbnailUrl?: string | null;
  /** 该企划缺人任务总数 */
  pendingCount: number;
  /** 涉及条目数 */
  itemCount: number;
  tasks: PlazaTask[];
}

export interface PlazaListDTO {
  baseTaskId?: string;
  keyword?: string;
  projectType?: string;
  sortBy?: PlazaSortBy;
  stageScope?: PlazaStageScope;
  pageNum?: number;
  pageSize?: number;
}

export interface PlazaTaskTypeOption {
  id: string;
  name: string;
}
