import { loader, type InferPageType } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";

const docs = defineDocs({
  dir: "docs/site",
  docs: { async: true },
});

export const docsSource = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export type DocsPageEntry = InferPageType<typeof docsSource>;
