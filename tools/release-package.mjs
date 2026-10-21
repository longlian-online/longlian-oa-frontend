#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";

import { join, relative, sep } from "node:path";
import process from "node:process";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const DIST_DIR = "dist";
const OUTPUT_DIR = "release";
const execFileAsync = promisify(execFile);
const EPOCH = new Date(0);
const ARCHIVE_PREFIX = "longlian-oa-frontend";
const tag = process.env.APP_VERSION || "";

if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag)) {
  throw new Error("APP_VERSION 必须是稳定语义版本标签，例如 v1.2.3。");
}

const archiveName = `${ARCHIVE_PREFIX}-${tag}.zip`;
const checksumName = `${archiveName}.sha256`;
const archivePath = join(OUTPUT_DIR, archiveName);
const checksumPath = join(OUTPUT_DIR, checksumName);
const files = await collectFiles(DIST_DIR);

if (!files.includes("index.html")) {
  throw new Error("dist 根目录缺少 index.html。");
}

await rm(OUTPUT_DIR, { recursive: true, force: true });
await mkdir(OUTPUT_DIR);
for (const file of files) {
  await utimes(join(DIST_DIR, file), EPOCH, EPOCH);
}
await execFileAsync("zip", ["-X", "-q", "-r", join("..", archivePath), "."], {
  cwd: DIST_DIR,
  env: { ...process.env, TZ: "UTC" },
});

const digest = await sha256(archivePath);
await writeFile(checksumPath, `${digest}  ${archiveName}\n`, "utf8");
console.log(`发布包：${archivePath}`);
console.log(`校验文件：${checksumPath}`);
console.log(`SHA256：${digest}`);

async function collectFiles(directory) {
  const files = [];

  async function visit(current) {
    const children = await readdir(current, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const path = join(current, child.name);
      if (child.isDirectory()) await visit(path);
      else if (child.isFile()) files.push(relative(directory, path).split(sep).join("/"));
    }
  }

  await visit(directory);
  return files;
}

async function sha256(path) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  if ((await stat(path)).size === 0) throw new Error("发布压缩包为空。");
  return hash.digest("hex");
}
