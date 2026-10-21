import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileRoutes } from "./tools/fileRoutes.ts";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import type { Plugin, ProxyOptions } from "vite-plus";
import { readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  version: string;
};
const buildTime = new Date().toISOString();

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

export function isAdminApiPath(pathname: string): boolean {
  return (
    pathname === "/admin/session" ||
    /^\/admin\/(?:admins|organizations|scheduled-tasks)\//.test(pathname)
  );
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
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || version),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
  fmt: {
    ignorePatterns: [".agents/skills/**"],
  },
  plugins: [ignoreUnknownRequests(), fileRoutes(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  // 路由是动态 import。只扫 index.html 会在首次进入页面时再优化依赖，
  // 浏览器拿到 504 Outdated Optimize Dep，动态模块失败后页面空白。
  optimizeDeps: {
    entries: ["index.html", "src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}"],
  },
  server: {
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
    },
    proxy: {
      "/app": apiProxy,
      "/common": apiProxy,
      "^/admin/session$": apiProxy,
      "^/admin/(?:admins|organizations|scheduled-tasks)/": apiProxy,
      "/orgadmin": apiProxy,
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
});
