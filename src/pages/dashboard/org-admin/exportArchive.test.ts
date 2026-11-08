import { expect, test } from "vite-plus/test";

import type { DownloadDirectoryHandle } from "./downloadDirectory";
import { packDownloadedFiles, writeStoredZip, type ArchiveWritable } from "./exportArchive";

test("压缩包按原名收流，缺失文件跳过", async () => {
  const chunks: Uint8Array[] = [];
  const destination = buffer(chunks);
  const result = await writeStoredZip(destination, [
    { fileId: "101", name: "成果.pdf", open: async () => streamOf("alpha") },
    { fileId: "202", name: "成果.pdf", open: async () => streamOf("beta") },
    { fileId: "303", name: "缺.pdf", open: async () => null },
  ]);

  expect(result).toEqual({ packed: 2, missing: 1 });
  const entries = readZip(concat(chunks));
  expect(entries.map((entry) => entry.name)).toEqual(["成果.pdf", "成果_202.pdf"]);
  expect(new TextDecoder().decode(entries[0]?.data)).toBe("alpha");
  expect(new TextDecoder().decode(entries[1]?.data)).toBe("beta");
});

test("导出读取资源 ID 文件，压缩包里仍是原名", async () => {
  const opened: string[] = [];
  const directory = {
    name: "下载",
    async getFileHandle(name: string) {
      opened.push(name);
      if (name === "303") throw new DOMException("missing", "NotFoundError");
      return {
        getFile: async () => ({ stream: () => streamOf(name) }),
      };
    },
  } as unknown as DownloadDirectoryHandle;
  const chunks: Uint8Array[] = [];
  const result = await packDownloadedFiles(
    directory,
    [
      { fileId: "101", name: "成果.pdf" },
      { fileId: "303", name: "没有" },
    ],
    buffer(chunks),
  );

  expect(opened).toEqual(["101.pdf", "303"]);
  expect(result).toEqual({ packed: 1, missing: 1 });
  expect(readZip(concat(chunks)).map((entry) => entry.name)).toEqual(["成果.pdf"]);
});

function buffer(chunks: Uint8Array[]): ArchiveWritable {
  return {
    async write(data: Uint8Array) {
      chunks.push(data.slice());
    },
    async close() {
      return undefined;
    },
  };
}

function streamOf(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, Math.min(2, bytes.byteLength)));
      if (bytes.byteLength > 2) controller.enqueue(bytes.subarray(2));
      controller.close();
    },
  });
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function readZip(bytes: Uint8Array): { name: string; data: Uint8Array }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error("压缩包没有目录尾");
  const count = view.getUint16(end + 8, true);
  let cursor = view.getUint32(end + 16, true);
  const entries: { name: string; data: Uint8Array }[] = [];
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("压缩包目录损坏");
    if (view.getUint16(cursor + 10, true) !== 0) throw new Error("压缩包不应压缩内容");
    const size = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extra = view.getUint16(cursor + 30, true);
    const comment = view.getUint16(cursor + 32, true);
    const local = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const dataStart =
      local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    entries.push({ name, data: bytes.slice(dataStart, dataStart + size) });
    cursor += 46 + nameLength + extra + comment;
  }
  return entries;
}
