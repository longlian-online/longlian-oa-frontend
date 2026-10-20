// @vitest-environment happy-dom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { useWorkshopPosition } from "./useWorkshopPosition";
import { clearSession, saveSession } from "@/lib/session";

let root: Root | undefined;
let container: HTMLElement | undefined;

function Workshop(): ReactElement {
  const ref = useWorkshopPosition();
  return (
    <div ref={ref}>
      <div aria-label="企划类型筛选" />
    </div>
  );
}

async function mount(): Promise<void> {
  container = document.createElement("main");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <MemoryRouter initialEntries={["/dashboard/workshop?page=2"]}>
        <Workshop />
      </MemoryRouter>,
    ),
  );
}

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  sessionStorage.clear();
  clearSession();
  vi.unstubAllGlobals();
});

test("return restores the last reading position even when the departing DOM has already clamped its scroll", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "fixture", userId: "123", defaultOrgId: "456" });
  await mount();
  const main = container!;
  const types = main.querySelector<HTMLElement>('[aria-label="企划类型筛选"]')!;
  main.scrollTop = 240;
  types.scrollLeft = 150;
  main.dispatchEvent(new Event("scroll"));
  main.scrollTop = 0;
  types.scrollLeft = 0;
  await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  await mount();
  expect(container?.scrollTop).toBe(240);
  expect(container?.querySelector<HTMLElement>('[aria-label="企划类型筛选"]')?.scrollLeft).toBe(
    150,
  );
});
