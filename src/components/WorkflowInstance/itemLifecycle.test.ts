import { expect, test } from "vite-plus/test";
import { createItemLifecycle } from "./itemLifecycle";

test("ignores an old project's deferred success after switching away and returning", async () => {
  const lifecycle = createItemLifecycle("a");
  const isCurrent = lifecycle.capture();
  let resolve!: () => void;
  let closeDialog = false;
  const pending = new Promise<void>((done) => {
    resolve = done;
  }).then(() => {
    if (isCurrent()) closeDialog = true;
  });
  lifecycle.switchTo("b");
  lifecycle.switchTo("a");
  resolve();
  await pending;
  expect(closeDialog).toBe(false);
  expect(lifecycle.capture()()).toBe(true);
});

test("same project refresh keeps the operation current, while a switch invalidates failures", () => {
  const lifecycle = createItemLifecycle("a");
  const isCurrent = lifecycle.capture();
  lifecycle.switchTo("a");
  expect(isCurrent()).toBe(true);
  lifecycle.switchTo("b");
  expect(isCurrent()).toBe(false);
});
