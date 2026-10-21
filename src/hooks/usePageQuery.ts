import { useCallback, useRef } from "react";
import { useSearchParams } from "react-router";

import { readPage, withPage } from "@/lib/pageQuery";

export function usePageQuery(
  key = "page",
): [number, (page: number | ((current: number) => number)) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsRef = useRef(searchParams);
  const setSearchParamsRef = useRef(setSearchParams);
  paramsRef.current = searchParams;
  setSearchParamsRef.current = setSearchParams;

  const setPage = useCallback(
    (next: number | ((current: number) => number)): void => {
      const currentParams = paramsRef.current;
      const current = readPage(currentParams, key);
      const nextPage = typeof next === "function" ? next(current) : next;
      const updated = withPage(currentParams, nextPage, key);
      if (updated.toString() === currentParams.toString()) return;
      setSearchParamsRef.current(updated, { preventScrollReset: true });
    },
    [key],
  );

  return [readPage(searchParams, key), setPage];
}
