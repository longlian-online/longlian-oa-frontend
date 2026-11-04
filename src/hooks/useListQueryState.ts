import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";

import {
  readListQuery,
  withListQuery,
  type ListQueryChoices,
  type ListQueryDefaults,
} from "@/lib/listQueryState";

export function useListQueryState<T extends ListQueryDefaults>(
  defaults: T,
  choices: ListQueryChoices<T> = {},
  pageKeys: readonly string[] = ["page"],
): [T, (values: Partial<T>) => void] {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const values = readListQuery(params, defaults, choices);
  function update(next: Partial<T>): void {
    const updated = withListQuery(params, defaults, next, pageKeys);
    if (updated.toString() === params.toString()) return;
    setParams(updated, { preventScrollReset: true, state: location.state });
  }
  return [values, update];
}

// Only submitted text is durable; unsent text remains a local form draft.
export function useListSearchDraft(keyword: string): [string, (value: string) => void] {
  const [text, setText] = useState(keyword);
  useEffect(() => setText(keyword), [keyword]);
  return [text, setText];
}
