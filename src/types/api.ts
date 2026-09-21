export interface ApiResult<T> {
  code: number;
  msg?: string;
  data?: T;
}

export type SessionScope = "user" | "admin" | "none";
