import { expect, test } from "vite-plus/test";

import { injectUmamiScript, umamiTrackingScript } from "./umami";

const WEBSITE_ID = "a9defdf7-a434-4c66-93cf-f657a576e39a";
const HTML = "<head>\n    <title>白箱</title>\n  </head>\n";

test("未配置站点标识时不注入统计脚本", () => {
  expect(umamiTrackingScript(undefined)).toBeNull();
  expect(umamiTrackingScript("  ")).toBeNull();
  expect(injectUmamiScript(HTML, undefined)).toBe(HTML);
});

test("按站点标识注入 Umami 脚本", () => {
  expect(injectUmamiScript(HTML, `  ${WEBSITE_ID}  `)).toBe(
    `<head>\n    <title>白箱</title>\n    <script defer src="https://umami.longlian.online/script.js" data-website-id="${WEBSITE_ID}"></script>\n  </head>\n`,
  );
});

test("拒绝无法安全写入 HTML 的站点标识", () => {
  expect(() => umamiTrackingScript(`${WEBSITE_ID}"></script>`)).toThrow(
    "VITE_UMAMI_WEBSITE_ID 不是合法的站点标识",
  );
});
