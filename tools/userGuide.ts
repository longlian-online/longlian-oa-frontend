import { resolve } from "node:path";
import type { Plugin } from "vite-plus";
import { build, createServer } from "vitepress";

export function userGuide(): Plugin {
  let guideRoot: string;
  let closeGuide: (() => Promise<void>) | undefined;

  return {
    name: "user-guide",
    configResolved(config) {
      guideRoot = resolve(config.root, "help");
    },
    async configureServer(server) {
      if (server.config.mode === "test") return;
      const guide = await createServer(guideRoot, {
        middlewareMode: true,
        hmr: { server: server.httpServer ?? undefined, path: "/__help_hmr" },
      });

      closeGuide = () => guide.close();
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (url.pathname === "/help") {
          response.writeHead(302, { Location: `/help/${url.search}` });
          response.end();
        } else if (url.pathname.startsWith("/help/")) {
          guide.middlewares(request, response, next);
        } else {
          next();
        }
      });
    },
    async writeBundle() {
      await build(guideRoot);
    },
    async closeBundle() {
      await closeGuide?.();
    },
  };
}
