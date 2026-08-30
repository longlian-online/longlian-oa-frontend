import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import Pages from "vite-plugin-pages";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import type { Plugin, ProxyOptions } from "vite-plus";

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

const apiProxy: ProxyOptions = {
  target: "https://sit.neo.oa.api.longlian.online",
  changeOrigin: true,
  configure(proxy) {
    proxy.on("proxyReq", (proxyRequest) => {
      proxyRequest.removeHeader("origin");
      proxyRequest.removeHeader("referer");
    });
  },
};

export default defineConfig({
  plugins: [ignoreUnknownRequests(), Pages({ dirs: "src/pages" }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/app": apiProxy,
      "/common": apiProxy,
      "^/admin/(?!login(?:/|$)|$).*": apiProxy,
      "/orgadmin": apiProxy,
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
});
