import { fileViewerRenderers } from "@file-viewer/vite-plugin";
import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileRoutes } from "./tools/fileRoutes.ts";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import type { Plugin, ProxyOptions } from "vite-plus";
import { readFileSync } from "node:fs";
import { releaseManifestAsset } from "./src/lib/frontendRelease.ts";
import { injectUmamiScript } from "./src/lib/umami.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  version: string;
};
const buildTime = new Date().toISOString();

export function frontendReleaseManifest(appVersion: string, appBuildTime: string): Plugin {
  return {
    name: "frontend-release-manifest",
    apply: "build",
    generateBundle() {
      this.emitFile(releaseManifestAsset(appVersion, appBuildTime));
    },
  };
}

export function umamiAnalytics(): Plugin {
  return {
    name: "umami-analytics",
    transformIndexHtml(html) {
      return injectUmamiScript(html, process.env.VITE_UMAMI_WEBSITE_ID);
    },
  };
}

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
    /^\/admin\/(?:admins|organizations|scheduled-tasks|storage-stats)\//.test(pathname)
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
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
  fmt: {
    ignorePatterns: [".agents/skills/**"],
  },
  plugins: [
    frontendReleaseManifest(version, buildTime),
    umamiAnalytics(),
    ignoreUnknownRequests(),
    fileRoutes(),
    react(),
    tailwindcss(),
    fileViewerRenderers({
      copyAssets: true,
      inject: false,
      autoPresets: true,
      // 已安装的 office/lite 不会带上压缩包 Worker。RAR、7z 需要 libarchive。
      renderers: ["archive"],
    }),
  ],
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
      "^/admin/(?:admins|organizations|scheduled-tasks|storage-stats|product-releases)/": apiProxy,
      "/orgadmin": apiProxy,
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
});
