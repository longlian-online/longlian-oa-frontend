import { describe, expect, test } from "vite-plus/test";

import { detailScrollDelta } from "./scrollTaskDetailIntoView";

const scrollport = { top: 0, bottom: 600 };

describe("detailScrollDelta", () => {
  test("只露出标题时把详情顶对齐到主滚动区顶", () => {
    expect(detailScrollDelta(scrollport, { top: 560, bottom: 1460 })).toBe(560);
    expect(detailScrollDelta({ top: 120, bottom: 860 }, { top: 800, bottom: 1700 })).toBe(680);
  });

  test("短详情从底部露出时只滚到完整可见", () => {
    expect(detailScrollDelta(scrollport, { top: 560, bottom: 680 })).toBe(80);
  });

  test("详情已经铺满滚动区时不滚动", () => {
    expect(detailScrollDelta(scrollport, { top: -180, bottom: 720 })).toBe(0);
  });

  test("详情完整可见时不滚动", () => {
    expect(detailScrollDelta(scrollport, { top: 100, bottom: 220 })).toBe(0);
  });

  test("详情在滚动区上方时把顶部对齐回来", () => {
    expect(detailScrollDelta(scrollport, { top: -40, bottom: 80 })).toBe(-40);
  });
});
