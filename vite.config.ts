import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import Pages from "vite-plugin-pages";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import type { Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function ignoreUnknownRequests(): Plugin {
  return {
    name: "ignore-unknown-requests",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (url.startsWith("/.well-known/") || url === "/favicon.ico") {
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [ignoreUnknownRequests(), Pages({ dirs: "src/pages" }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/app": {
        target: "https://sit.neo.oa.api.longlian.online",
        changeOrigin: true,
      },
      "/common": {
        target: "https://sit.neo.oa.api.longlian.online",
        changeOrigin: true,
      },
      "/admin": {
        target: "https://sit.neo.oa.api.longlian.online",
        changeOrigin: true,
      },
      "/orgadmin": {
        target: "https://sit.neo.oa.api.longlian.online",
        changeOrigin: true,
      },
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
});
