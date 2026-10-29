#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import process from "node:process";
import { pipeline } from "node:stream/promises";

const API_BASE = "https://api.cnb.cool";
const REPO = "longlian.online/longlian-oa-frontend";
const token = required("CNB_TOKEN");
const tag = required("TAG");
const commit = required("COMMIT");
const files = process.argv.slice(2);

if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag)) {
  throw new Error("TAG 必须是稳定语义版本标签。");
}
if (!/^[0-9a-f]{40}$/.test(commit)) {
  throw new Error("COMMIT 必须是 40 位小写提交 SHA。");
}
if (files.length === 0) {
  throw new Error("至少指定一个发布文件。");
}

const release = await ensureRelease();

for (const file of files) {
  await uploadAsset(release.id, file);
}

await request("PATCH", `/${REPO}/-/releases/${release.id}`, {
  body: releaseBody(tag, commit),
  draft: false,
  make_latest: "true",
  name: tag,
  prerelease: false,
});

console.log(`CNB Release 已发布：${tag}`);

async function ensureRelease() {
  const existing = await request("GET", `/${REPO}/-/releases/tags/${tag}`, null, [404]);
  if (existing.status === 200) {
    if (existing.body.draft !== true) {
      throw new Error(`CNB Release ${tag} 已发布，不覆盖已有版本。`);
    }
    return existing.body;
  }

  const created = await request("POST", `/${REPO}/-/releases`, {
    body: releaseBody(tag, commit),
    draft: true,
    make_latest: "false",
    name: tag,
    prerelease: false,
    tag_name: tag,
    target_commitish: commit,
  });
  return created.body;
}

async function uploadAsset(releaseId, file) {
  const metadata = await stat(file);
  const name = basename(file);
  const upload = await request("POST", `/${REPO}/-/releases/${releaseId}/asset-upload-url`, {
    asset_name: name,
    overwrite: false,
    size: metadata.size,
    ttl: 0,
  });
  const uploadUrl = new URL(upload.body.upload_url);
  const verifyUrl = new URL(upload.body.verify_url, API_BASE);
  const expected = await sha256(file);

  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-length": String(metadata.size) },
    body: createReadStream(file),
    duplex: "half",
  });
  if (!uploaded.ok) {
    throw new Error(`上传 ${name} 失败：HTTP ${uploaded.status}`);
  }

  await request("POST", `${verifyUrl.pathname}${verifyUrl.search}`);
  const published = await request("GET", `/${REPO}/-/releases/${releaseId}`);
  const asset = (published.body.assets || []).find((item) => item.name === name);
  if (!asset || asset.size !== metadata.size) {
    throw new Error(`CNB 未登记 ${name} 或其大小不一致。`);
  }
  if (asset.hash_algo?.toLowerCase() === "sha256" && asset.hash_value?.toLowerCase() !== expected) {
    throw new Error(`${name} 的 CNB SHA256 与本地文件不一致。`);
  }
}

function releaseBody(version, sha) {
  return [
    "前端静态站点构建包。",
    "",
    `- 提交：\`${sha}\``,
    "- ZIP 解压后根目录为 `index.html` 和 `version.json`。",
    "- 使用同名 `.sha256` 文件校验 ZIP。",
  ].join("\n");
}

async function sha256(file) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(file), hash);
  return hash.digest("hex");
}

async function request(method, path, body, accepted = []) {
  const response = await fetch(new URL(path, API_BASE), {
    method,
    headers: {
      accept: "application/vnd.cnb.api+json",
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
  }
  if (!response.ok && !accepted.includes(response.status)) {
    const message = parsed?.message || parsed?.errmsg || response.statusText;
    throw new Error(`${method} ${path} 失败：HTTP ${response.status} ${message}`);
  }
  return { status: response.status, body: parsed };
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`缺少环境变量 ${name}。`);
  return value;
}
