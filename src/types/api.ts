//request理论上不应该import业务层(planning.ts)，所以另开一个api层
export interface ApiResult<T> {
  code: number;
  msg?: string;
  data?: T;
}

export type SessionScope = "user" | "admin" | "none";
