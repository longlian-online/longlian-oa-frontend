import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vite-plus/test";

import { isAdminApiPath } from "./vite.config";

describe("admin dev-server proxy matching", () => {
  test("keeps admin page URLs in the SPA", () => {
    expect(isAdminApiPath("/admin/scheduled-tasks")).toBe(false);
    expect(isAdminApiPath("/admin/organizations")).toBe(false);
    expect(isAdminApiPath("/admin/storage-stats")).toBe(false);
  });

  test("proxies admin API URLs", () => {
    expect(isAdminApiPath("/admin/scheduled-tasks/")).toBe(true);
    expect(isAdminApiPath("/admin/scheduled-tasks/cleanup/trigger")).toBe(true);
    expect(isAdminApiPath("/admin/session")).toBe(true);
    expect(isAdminApiPath("/admin/storage-stats/")).toBe(true);
  });
});

const runFile = promisify(execFile);

describe("release package", () => {
  test("packages the package.json version deterministically", async () => {
    const root = await mkdtemp(join(tmpdir(), "frontend-release-"));
    const first = join(root, "first");
    const second = join(root, "second");

    try {
      await writeDist(first, new Date("2024-01-01T00:00:00Z"));
      await writeDist(second, new Date("2026-02-02T00:00:00Z"));
      const firstResult = await packageRelease(first);
      const secondResult = await packageRelease(second);

      expect(firstResult.digest).toBe(secondResult.digest);
      expect(firstResult.checksum).toBe(`${firstResult.digest}  longlian-oa-frontend-v1.2.3.zip\n`);

      const listing = await runFile("unzip", ["-Z1", firstResult.archivePath]);
      expect(listing.stdout).toBe("index.html\nassets/\nassets/app.js\n");
      const extracted = join(root, "extracted");
      await runFile("unzip", ["-q", firstResult.archivePath, "-d", extracted]);
      expect(await readFile(join(extracted, "index.html"), "utf8")).toContain("1.2.3");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects a tag that differs from package.json", async () => {
    const root = await mkdtemp(join(tmpdir(), "frontend-release-"));
    try {
      await writeDist(root, new Date(0));
      await expect(
        runFile(process.execPath, [join(process.cwd(), "tools/release-package.mjs")], {
          cwd: root,
          env: { ...process.env, GITHUB_REF_NAME: "v9.9.9" },
        }),
      ).rejects.toThrow("标签 v9.9.9 与 package.json version 1.2.3 不一致。");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function writeDist(root: string, modifiedAt: Date) {
  await mkdir(join(root, "dist", "assets"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({ version: "1.2.3" }));
  await writeFile(join(root, "dist", "index.html"), "<html>1.2.3</html>");
  await writeFile(join(root, "dist", "assets", "app.js"), "console.log(1)\n");
  await utimes(join(root, "dist", "index.html"), modifiedAt, modifiedAt);
  await utimes(join(root, "dist", "assets", "app.js"), modifiedAt, modifiedAt);
}

async function packageRelease(root: string) {
  await runFile(process.execPath, [join(process.cwd(), "tools/release-package.mjs")], {
    cwd: root,
    env: { ...process.env, GITHUB_REF_NAME: "v1.2.3" },
  });
  const archivePath = join(root, "release", "longlian-oa-frontend-v1.2.3.zip");
  const archive = await readFile(archivePath);
  return {
    archivePath,
    checksum: await readFile(`${archivePath}.sha256`, "utf8"),
    digest: createHash("sha256").update(archive).digest("hex"),
  };
}
