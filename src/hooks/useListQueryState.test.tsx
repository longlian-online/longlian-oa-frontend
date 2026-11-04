// @vitest-environment happy-dom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { useListQueryState, useListSearchDraft } from "@/hooks/useListQueryState";
import { usePageQuery } from "@/hooks/usePageQuery";

let container: HTMLDivElement;
let root: Root;
let router: ReturnType<typeof createMemoryRouter>;
const observations: { keyword: string; status: string; orderDir: string; page: number }[] = [];
const defaults = { keyword: "", status: "ALL", orderDir: "DESC" };

function List(): ReactElement {
  const [values, update] = useListQueryState(defaults, { status: ["ALL", "ACTIVE"] });
  const [draft, setDraft] = useListSearchDraft(values.keyword);
  const [page, setPage] = usePageQuery();
  observations.push({ ...values, page });
  return (
    <>
      <input value={draft} onChange={(event) => setDraft(event.target.value)} />
      <output>
        {values.status}:{page}:{values.keyword}
      </output>
      <button onClick={() => update({ keyword: draft, status: "ACTIVE" })}>搜索</button>
      <button onClick={() => setPage(4)}>第四页</button>
    </>
  );
}

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  observations.length = 0;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async (): Promise<void> => {
  await act(async () => root.unmount());
  router.dispose();
  container.remove();
  vi.unstubAllGlobals();
});
async function mount(): Promise<void> {
  router = createMemoryRouter([{ path: "/list", Component: List }], {
    initialEntries: [
      {
        pathname: "/list",
        search: "?keyword=百合&page=3&view=about",
        state: { planningListReturnTo: "/dashboard/planning?page=2" },
      },
    ],
  });
  await act(async () => root.render(<RouterProvider router={router} />));
}

test("筛选变更原子回到第一页，翻页保留条件和多级返回 state", async (): Promise<void> => {
  await mount();
  observations.length = 0;
  await act(async () => container.querySelectorAll("button")[0]!.click());
  expect(container.querySelector("output")?.textContent).toBe("ACTIVE:1:百合");
  expect(observations.every((item) => item.page === 1)).toBe(true);
  expect(router.state.location.state).toEqual({
    planningListReturnTo: "/dashboard/planning?page=2",
  });
  expect(new URLSearchParams(router.state.location.search).get("view")).toBe("about");
  await act(async () => container.querySelectorAll("button")[1]!.click());
  expect(container.querySelector("output")?.textContent).toBe("ACTIVE:4:百合");
  expect(router.state.location.state).toEqual({
    planningListReturnTo: "/dashboard/planning?page=2",
  });
  await act(async () => {
    await router.navigate(-1);
  });
  expect(container.querySelector("output")?.textContent).toBe("ACTIVE:1:百合");
});

test("历史切换同步草稿；相同参数不创建多余导航，URL 可重挂载恢复", async (): Promise<void> => {
  await mount();
  await act(async () => {
    await router.navigate("/list?keyword=小说&page=2&status=ACTIVE");
  });
  expect(container.querySelector<HTMLInputElement>("input")?.value).toBe("小说");
  await act(async () => {
    await router.navigate(-1);
  });
  expect(container.querySelector<HTMLInputElement>("input")?.value).toBe("百合");
  await act(async () => {
    await router.navigate("/list?keyword=百合&status=ACTIVE&view=about");
  });
  const key = router.state.location.key;
  await act(async () => container.querySelectorAll("button")[0]!.click());
  expect(router.state.location.key).toBe(key);
});
