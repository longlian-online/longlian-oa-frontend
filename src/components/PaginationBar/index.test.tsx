import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import PaginationBar from "./index";

test.each([3, 5])("第 %i 页保留前后相邻页码", (page: number) => {
  const html = renderToStaticMarkup(
    <PaginationBar page={page} pageSize={10} total={70} onPageChange={() => {}} />,
  );
  const pages = [...html.matchAll(/<button\b[^>]*>(\d+)<\/button>/g)].map((match) =>
    Number(match[1]),
  );

  expect(pages).toContain(page - 1);
  expect(pages).toContain(page);
  expect(pages).toContain(page + 1);
});
