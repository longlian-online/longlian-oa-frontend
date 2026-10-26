import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import ProjectCustomFields from "./index";

test("renders nothing when a project has no custom fields", (): void => {
  expect(renderToStaticMarkup(<ProjectCustomFields fields={[]} />)).toBe("");
});

test("renders saved names and values in order, including an empty value", (): void => {
  const html = renderToStaticMarkup(
    <dl>
      <ProjectCustomFields
        fields={[
          { name: "作者", value: "xxxx" },
          { name: "作者", value: "   " },
          { name: "译者", value: "" },
        ]}
      />
    </dl>,
  );

  expect(html.indexOf("作者")).toBeLessThan(html.indexOf("xxxx"));
  expect(html.indexOf("xxxx")).toBeLessThan(html.lastIndexOf("作者"));
  expect(html.indexOf("译者")).toBeGreaterThan(html.lastIndexOf("作者"));
  expect(html.match(/未填写/g)).toHaveLength(2);
});
