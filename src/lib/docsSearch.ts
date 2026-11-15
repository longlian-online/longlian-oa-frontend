import { initAdvancedSearch, type SearchServer } from "fumadocs-core/search/server";
import type { SortedResult } from "fumadocs-core/search";

import { docsSource } from "@/lib/docs";

let index: SearchServer | undefined;

export function searchDocs(query: string): Promise<SortedResult[]> {
  index ??= initAdvancedSearch({
    indexes: async () =>
      Promise.all(
        docsSource.getPages().map(async (page) => ({
          id: page.url,
          url: page.url,
          title: page.data.title,
          structuredData: await page.data.structuredData(),
        })),
      ),
  });

  return index.search(query);
}
