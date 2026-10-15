import { expect, test } from "vite-plus/test";

import { projectThumbnailSrc } from "@/lib/projectThumbnail";

test("列表图片优先用缩略图，没有时回退封面", () => {
  expect(projectThumbnailSrc("https://cdn/thumb.png", "https://cdn/cover.png")).toBe(
    "https://cdn/thumb.png",
  );
  expect(projectThumbnailSrc("  ", "https://cdn/cover.png")).toBe("https://cdn/cover.png");
  expect(projectThumbnailSrc(null, null)).toBeUndefined();
});
