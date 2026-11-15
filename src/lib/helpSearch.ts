import { initAdvancedSearch, type SearchServer } from "fumadocs-core/search/server";
import type { SortedResult } from "fumadocs-core/search";

import { helpSource } from "@/lib/help";

let index: SearchServer | undefined;

export function searchHelp(query: string): Promise<SortedResult[]> {
  index ??= initAdvancedSearch({
    indexes: async () =>
      Promise.all(
        helpSource.getPages().map(async (page) => ({
          id: page.url,
          url: page.url,
          title: page.data.title,
          structuredData: await page.data.structuredData(),
        })),
      ),
  });

  return index.search(query);
}
