import { withPage } from "@/lib/pageQuery";

export type ListQueryDefaults = Record<string, string>;
export type ListQueryChoices<T extends ListQueryDefaults> = Partial<
  Record<keyof T, readonly string[]>
>;

export function readListQuery<T extends ListQueryDefaults>(
  params: URLSearchParams,
  defaults: T,
  choices: ListQueryChoices<T> = {},
): T {
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    const value = params.get(key)?.trim();
    const allowed = choices[key];
    result[key] = (
      value && (!allowed || allowed.includes(value)) ? value : defaults[key]
    ) as T[typeof key];
  }
  return result;
}

export function withListQuery<T extends ListQueryDefaults>(
  params: URLSearchParams,
  defaults: T,
  values: Partial<T>,
  pageKeys: readonly string[] = ["page"],
): URLSearchParams {
  let next = new URLSearchParams(params);
  for (const key of pageKeys) next = withPage(next, 1, key);
  for (const key of Object.keys(values) as (keyof T & string)[]) {
    const value = values[key]?.trim() ?? "";
    if (!value || value === defaults[key]) next.delete(key);
    else next.set(key, value);
  }
  return next;
}
