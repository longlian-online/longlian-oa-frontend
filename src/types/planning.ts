export type ProjectStatus =
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ARCHIVED"
  | "进行中"
  | "已完成"
  | "已归档";

export interface ProjectTypeInfoVO {
  id: string;
  name: string;
}

export interface ProjectInfoVO {
  id: number;
  title: string;
  description?: string;
  coverUrl?: string;
  projectType: string;
  projectStatus: ProjectStatus;
  metadata?: string;
  creatorAvatarUrl?: string;
  creatorNickname?: string | null;
  creatorLastSubmittedAt?: string | null;
}

export interface ProjectDetailInfoVO {
  id: number;
  title: string;
  alias?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  typeName: string;
  metadata?: string;
  description?: string;
  status: ProjectStatus;
  progressPercent: number;
  claimedTaskCount: number;
  pendingTaskCount: number;
  inWorkshop: boolean;
  isCreator: boolean;
  hasItems: boolean;
  createdAt?: string;
}

export interface ProjectListDTO {
  keyword?: string;
  projectType?: string;
  pageNum?: number;
  pageSize?: number;
  /** 绝对偏移量；后端传入后按它取窗口，供首页条数与其他页不同的分页使用 */
  offset?: number;
  sortByTime?: "CREATE" | "UPDATE";
  orderDir?: "DESC" | "ASC";
}

export interface ProjectCreateDTO {
  title: string;
  alias: string;
  typeId: string;
  metadata: string;
  description: string;
  coverFileId: string;
  thumbnailFileId?: string;
}

export interface ProjectUpdateDTO {
  title: string;
  alias: string;
  typeId: string;
  metadata: string;
  description: string;
  coverFileId?: string;
  thumbnailFileId?: string;
  status?: ProjectStatus;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  hasNext: boolean;
}

export interface ApiResult<T> {
  code: number;
  msg?: string;
  data?: T;
}
