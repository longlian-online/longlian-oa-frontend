// @vitest-environment happy-dom
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider, useNavigate } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";

import PageTransition from "./PageTransition";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function Draft(): ReactElement {
  const [value, setValue] = useState("");
  const navigate = useNavigate();
  return (
    <>
      <input
        aria-label="未提交内容"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        onClick={() => {
          setValue("已填写译文");
          void navigate("?taskInstanceId=slot2", { replace: true });
        }}
      >
        定位任务
      </button>
    </>
  );
}

function Page(): ReactElement {
  return (
    <PageTransition>
      <Draft />
    </PageTransition>
  );
}

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

test("updating task address on the same page preserves in-progress input, while another page starts a new draft", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const router = createMemoryRouter([{ path: "*", Component: Page }], {
    initialEntries: ["/tasks"],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(<RouterProvider router={router} />));
  await act(async () => container?.querySelector("button")?.click());
  expect(container.querySelector("input")?.value).toBe("已填写译文");
  await act(async () => {
    await router.navigate("/another-project");
  });
  expect(container.querySelector("input")?.value).toBe("");
});
