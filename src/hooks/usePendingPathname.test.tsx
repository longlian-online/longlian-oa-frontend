// @vitest-environment happy-dom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, Outlet, RouterProvider, type RouterProviderProps } from "react-router";
import { afterEach, expect, test } from "vite-plus/test";

import { usePageLoadingVisible, usePendingPathname } from "@/hooks/usePendingPathname";

function Probe(): ReactElement {
  const pathname = usePendingPathname();
  const loading = usePageLoadingVisible();
  return (
    <>
      <p>{`${pathname}|${loading ? "loading" : "ready"}`}</p>
      <Outlet />
    </>
  );
}

let releaseNavigation: () => void = () => {};
let root: Root | undefined;
let container: HTMLDivElement | undefined;

function holdNavigation(): Promise<null> {
  return new Promise((resolve) => {
    releaseNavigation = (): void => resolve(null);
  });
}

function probeText(): string {
  return container?.querySelector("p")?.textContent ?? "";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

async function mount(router: RouterProviderProps["router"]): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<RouterProvider router={router} />);
  });
}

afterEach((): void => {
  releaseNavigation();
  root?.unmount();
  container?.remove();
  root = undefined;
  container = undefined;
  releaseNavigation = (): void => {};
});

test("pathname changes move focus immediately and show loading only after the delay", async (): Promise<void> => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: Probe,
        children: [
          { index: true, element: <h1>home</h1> },
          { path: "next", loader: () => holdNavigation(), element: <h1>next</h1> },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );
  await mount(router);
  expect(probeText()).toBe("/|ready");

  let navigation: Promise<unknown> | undefined;
  act(() => {
    navigation = router.navigate("/next");
  });
  expect(probeText()).toBe("/next|ready");

  await act(async () => {
    await wait(100);
  });
  expect(probeText()).toBe("/next|ready");

  await act(async () => {
    await wait(80);
  });
  expect(probeText()).toBe("/next|loading");

  releaseNavigation();
  await act(async () => {
    await navigation;
  });
  expect(probeText()).toBe("/next|ready");
  expect(container?.querySelector("h1")?.textContent).toBe("next");
});

test("a search change on the same pathname never replaces the page", async (): Promise<void> => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: Probe,
        loader: ({ request }) =>
          new URL(request.url).searchParams.has("hold") ? holdNavigation() : null,
      },
    ],
    { initialEntries: ["/"] },
  );
  await mount(router);
  expect(probeText()).toBe("/|ready");

  let navigation: Promise<unknown> | undefined;
  act(() => {
    navigation = router.navigate("/?hold=1");
  });
  await act(async () => {
    await wait(200);
  });
  expect(probeText()).toBe("/|ready");

  releaseNavigation();
  await act(async () => {
    await navigation;
  });
  expect(probeText()).toBe("/|ready");
});
