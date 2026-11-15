import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { use, type ReactElement } from "react";
import { ScrollRestoration } from "react-router";

import type { DocsPageEntry } from "@/lib/docs";

interface DocsArticleProps {
  page: DocsPageEntry;
}

export default function DocsArticle({ page }: DocsArticleProps): ReactElement {
  const { body: Content, toc } = use(page.data.load());

  return (
    <DocsPage toc={toc}>
      <ScrollRestoration getKey={(location) => location.pathname + location.hash} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody className="prose-headings:font-medium">
        <Content components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
