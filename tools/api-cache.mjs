#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";

const DEFAULT_SOURCE_URL = "https://sit.neo.oa.api.longlian.online/v3/api-docs";
const SOURCE_URL = process.env.LONGLIAN_API_DOCS_URL || DEFAULT_SOURCE_URL;
const CACHE_DIR = "docs/api-cache";
const OPENAPI_DIR = join(CACHE_DIR, "openapi");
const OPERATIONS_DIR = join(CACHE_DIR, "operations");
const MANIFEST_FILE = join(CACHE_DIR, "manifest.json");
const SUMMARY_FILE = join(CACHE_DIR, "summary.md");
const COMMANDS = new Set(["update", "check"]);

const command = process.argv[2] || "check";

if (!COMMANDS.has(command)) {
  console.error("用法：node tools/api-cache.mjs <update|check>");
  process.exit(1);
}

if (command === "check" && process.env.SKIP_API_CACHE_CHECK === "1") {
  console.log("API 缓存检查已通过 SKIP_API_CACHE_CHECK=1 跳过。");
  process.exit(0);
}

try {
  if (command === "update") {
    await updateCache();
  } else {
    await checkCache();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function updateCache() {
  const documents = await fetchDocuments();
  const operations = collectOperations(documents);
  const manifest = buildManifest(documents, operations);

  await mkdir(OPENAPI_DIR, { recursive: true });
  await mkdir(OPERATIONS_DIR, { recursive: true });
  await rm(OPERATIONS_DIR, { recursive: true, force: true });
  await mkdir(OPERATIONS_DIR, { recursive: true });

  for (const document of documents) {
    await writeJson(join(OPENAPI_DIR, `${document.slug}.json`), document.openapi);
  }

  for (const operation of operations) {
    await writeJson(join(OPERATIONS_DIR, `${operation.id}.json`), operation.cache);
  }

  await writeJson(MANIFEST_FILE, manifest);
  await writeFile(SUMMARY_FILE, buildSummary(manifest), "utf8");

  console.log(`API 缓存已更新：${documents.length} 组文档，${operations.length} 个接口。`);
}

async function checkCache() {
  const cachedManifest = await readCachedManifest();
  const documents = await fetchDocuments();
  const operations = collectOperations(documents);
  const latestManifest = buildManifest(documents, operations);
  const problems = compareManifest(cachedManifest, latestManifest);

  if (problems.length > 0) {
    console.error("API 缓存已过期，请先运行：vp run api:update");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  console.log(
    `API 缓存命中：${latestManifest.documents.length} 组文档，${latestManifest.operations.length} 个接口。`,
  );
}

async function readCachedManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_FILE, "utf8"));
  } catch {
    throw new Error("缺少 API 缓存，请先运行：vp run api:update");
  }
}

async function fetchDocuments() {
  const configUrl = new URL("./api-docs/swagger-config", SOURCE_URL).toString();
  const config = await fetchJson(configUrl);
  const entries = [{ name: "全部", url: SOURCE_URL }];

  if (Array.isArray(config.urls)) {
    for (const item of config.urls) {
      if (typeof item?.name === "string" && typeof item?.url === "string") {
        entries.push({
          name: item.name,
          url: new URL(item.url, SOURCE_URL).toString(),
        });
      }
    }
  }

  const seen = new Set();
  const documents = [];

  for (const entry of entries) {
    const slug = slugify(entry.name);
    if (seen.has(slug)) continue;
    seen.add(slug);

    const openapi = sortValue(await fetchJson(entry.url));
    const json = JSON.stringify(openapi);
    const paths = openapi.paths && typeof openapi.paths === "object" ? openapi.paths : {};
    const operations = listOperations(openapi);

    documents.push({
      name: entry.name,
      slug,
      url: entry.url,
      file: `openapi/${slug}.json`,
      sha256: sha256(json),
      pathCount: Object.keys(paths).length,
      operationCount: operations.length,
      openapi,
    });
  }

  return documents;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`拉取 API 文档失败：${response.status} ${url}`);
  }

  return response.json();
}

function collectOperations(documents) {
  const operations = [];

  for (const document of documents) {
    for (const operation of listOperations(document.openapi)) {
      const id = `${document.slug}_${slugify(`${operation.method}_${operation.path}`)}`;
      const cache = sortValue({
        document: document.name,
        sourceUrl: document.url,
        path: operation.path,
        method: operation.method,
        operation: operation.operation,
      });
      const json = JSON.stringify(cache);

      operations.push({
        id,
        document: document.name,
        method: operation.method,
        path: operation.path,
        summary: operation.operation.summary || "",
        tags: operation.operation.tags || [],
        file: `operations/${id}.json`,
        sha256: sha256(json),
        cache,
      });
    }
  }

  operations.sort((a, b) =>
    `${a.document} ${a.path} ${a.method}`.localeCompare(`${b.document} ${b.path} ${b.method}`),
  );

  return operations;
}

function listOperations(openapi) {
  const methods = new Set(["get", "post", "put", "delete", "patch"]);
  const paths = openapi.paths && typeof openapi.paths === "object" ? openapi.paths : {};
  const operations = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!methods.has(method)) continue;
      operations.push({
        path,
        method: method.toUpperCase(),
        operation,
      });
    }
  }

  return operations;
}

function buildManifest(documents, operations) {
  return {
    version: 1,
    sourceUrl: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    documents: documents.map(({ name, slug, url, file, sha256, pathCount, operationCount }) => ({
      name,
      slug,
      url,
      file,
      sha256,
      pathCount,
      operationCount,
    })),
    operations: operations.map(({ id, document, method, path, summary, tags, file, sha256 }) => ({
      id,
      document,
      method,
      path,
      summary,
      tags,
      file,
      sha256,
    })),
  };
}

function compareManifest(cached, latest) {
  const problems = [];
  const cachedDocuments = new Map((cached.documents || []).map((item) => [item.slug, item]));
  const latestDocuments = new Map((latest.documents || []).map((item) => [item.slug, item]));
  const cachedOperations = new Map((cached.operations || []).map((item) => [item.id, item]));
  const latestOperations = new Map((latest.operations || []).map((item) => [item.id, item]));

  compareHashMaps("文档", cachedDocuments, latestDocuments, problems);
  compareHashMaps("接口", cachedOperations, latestOperations, problems);

  return problems.slice(0, 40);
}

function compareHashMaps(label, cachedMap, latestMap, problems) {
  for (const [key, latestItem] of latestMap) {
    const cachedItem = cachedMap.get(key);
    if (!cachedItem) {
      problems.push(`${label}新增：${key}`);
      continue;
    }
    if (cachedItem.sha256 !== latestItem.sha256) {
      problems.push(`${label}变更：${key}`);
    }
  }

  for (const key of cachedMap.keys()) {
    if (!latestMap.has(key)) {
      problems.push(`${label}删除：${key}`);
    }
  }
}

function buildSummary(manifest) {
  const lines = [
    "# API 缓存摘要",
    "",
    `来源：${manifest.sourceUrl}`,
    `更新时间：${manifest.generatedAt}`,
    "",
    "## 文档分组",
    "",
    "| 分组 | 路径数 | 接口数 | 缓存文件 |",
    "| ---- | ------ | ------ | -------- |",
  ];

  for (const document of manifest.documents) {
    lines.push(
      `| ${document.name} | ${document.pathCount} | ${document.operationCount} | \`${document.file}\` |`,
    );
  }

  lines.push(
    "",
    "## 接口索引",
    "",
    "| 分组 | 方法 | 路径 | 摘要 | 缓存文件 |",
    "| ---- | ---- | ---- | ---- | -------- |",
  );

  for (const operation of manifest.operations) {
    lines.push(
      `| ${operation.document} | ${operation.method} | \`${operation.path}\` | ${operation.summary || "-"} | \`${operation.file}\` |`,
    );
  }

  lines.push(
    "",
    "## 使用方式",
    "",
    "- 更新缓存：`vp run api:update`",
    "- 检查缓存：`vp run api:check`",
    "- 跳过提交前检查：`SKIP_API_CACHE_CHECK=1 git commit ...`",
  );

  return `${lines.join("\n")}\n`;
}

async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = sortValue(value[key]);
        return result;
      }, {});
  }

  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[\s/{}]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
