import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const script = fileURLToPath(new URL("./api-cache.mjs", import.meta.url));
let server;
let directory;
let sourceUrl;
let grouped = true;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "api-cache-test-"));
  await copyFile(script, join(directory, "api-cache.mjs"));
  server = http.createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/v3/api-docs/swagger-config") {
      response.end(
        JSON.stringify({ urls: grouped ? [{ name: "用户端", url: "/v3/api-docs/user" }] : [] }),
      );
      return;
    }
    response.end(
      JSON.stringify({
        openapi: "3.0.1",
        servers: [{ url: "https://internal.example/private" }],
        paths: { "/users": { get: { summary: "List users" } } },
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  sourceUrl = `http://127.0.0.1:${server.address().port}/v3/api-docs?token=private-token`;
  await writeFile(
    join(directory, ".env"),
    `API_CACHE_SOURCE_URL=${sourceUrl}\nAPI_CACHE_OUTPUT_DIR=output\n`,
  );
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
});

async function run(command) {
  return execFileAsync(process.execPath, ["api-cache.mjs", command], {
    cwd: directory,
    env: Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("API_CACHE_")),
    ),
  });
}

test("standalone CLI loads .env and omits source URL from generated files", async () => {
  await run("update");
  const manifest = await readFile(join(directory, "output/manifest.json"), "utf8");
  const summary = await readFile(join(directory, "output/summary.md"), "utf8");
  const operation = await readFile(
    join(directory, "output/operations/用户端_get_-users.json"),
    "utf8",
  );
  const openapi = await readFile(join(directory, "output/openapi/全部.json"), "utf8");
  for (const content of [manifest, summary, operation, openapi]) {
    assert.ok(!content.includes("private-token"));
    assert.ok(!content.includes("127.0.0.1"));
    assert.ok(!content.includes("internal.example"));
  }
  await run("check");
});

test("update removes OpenAPI files for deleted groups", async () => {
  grouped = false;
  await run("update");
  assert.deepEqual(await readdir(join(directory, "output/openapi")), ["全部.json"]);
});

test("check rejects an older cache format", async () => {
  const manifestPath = join(directory, "output/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.version = 1;
  await writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(run("check"), /API 缓存已过期/);
});
