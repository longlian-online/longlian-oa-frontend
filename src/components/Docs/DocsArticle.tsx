import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { use, type ReactElement } from "react";
import { ScrollRestoration } from "react-router";

import { getDocsIcon } from "@/lib/docsIcons";
import type { DocsPageEntry } from "@/lib/docs";

interface DocsArticleProps {
  page: DocsPageEntry;
}

export default function DocsArticle({ page }: DocsArticleProps): ReactElement {
  const { body: Content, toc } = use(page.data.load());
  const icon = getDocsIcon(page.data.icon);

  return (
    <DocsPage toc={toc}>
      <ScrollRestoration getKey={(location) => location.pathname + location.hash} />
      <DocsTitle className="flex items-center gap-3 font-medium">
        {icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-foreground/10 [&_svg]:size-5">
            {icon}
          </span>
        )}
        {page.data.title}
      </DocsTitle>
      <DocsBody className="prose-headings:font-medium">
        <Content components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
