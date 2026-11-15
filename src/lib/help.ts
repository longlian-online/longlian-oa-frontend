import { loader, type InferPageType } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";

const docs = defineDocs({
  dir: "help",
  docs: { async: true },
});

export const helpSource = loader({
  baseUrl: "/help",
  source: docs.toFumadocsSource(),
});

export type HelpPage = InferPageType<typeof helpSource>;
