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

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

test("整页底栏模式在单页时保留总数收尾，多页时展示当前页汇总", () => {
  const singlePageHtml = renderToStaticMarkup(
    <PaginationBar
      variant="page"
      unit="个企划"
      page={1}
      pageSize={16}
      total={6}
      onPageChange={() => {}}
    />,
  );
  expect(plainText(singlePageHtml)).toBe("共 6 个企划 已显示全部");
  expect(singlePageHtml).not.toContain('aria-label="分页"');

  const multiPageHtml = renderToStaticMarkup(
    <PaginationBar
      variant="page"
      unit="个企划"
      page={2}
      pageSize={16}
      total={40}
      onPageChange={() => {}}
    />,
  );
  expect(plainText(multiPageHtml)).toContain("共 40 个企划 第 2 / 3 页");
  expect(multiPageHtml).toContain('aria-label="分页"');

  const emptyHtml = renderToStaticMarkup(
    <PaginationBar variant="page" page={1} pageSize={16} total={0} onPageChange={() => {}} />,
  );
  expect(emptyHtml).toBe("");
});
