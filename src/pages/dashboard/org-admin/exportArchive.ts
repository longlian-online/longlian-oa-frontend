import { DirectoryAccessError, type DownloadDirectoryHandle } from "./downloadDirectory";
import { archiveEntryPaths, resourceFileName } from "./fileDownload";

export interface ArchiveWritable {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort?: () => Promise<void>;
}

export interface ArchiveSource {
  fileId: string;
  name: string;
  directories?: string[];
  open: () => Promise<ReadableStream<Uint8Array> | null>;
}

const ZIP64_LIMIT = 0xffffffff;
const ENTRY_LIMIT = 0xffff;

export async function pickExportArchive(): Promise<ArchiveWritable> {
  const picker = (window as Window & SavePickerWindow).showSaveFilePicker;
  if (typeof picker !== "function") {
    throw new DirectoryAccessError("当前浏览器不能保存压缩包，请使用 Chrome 或 Edge");
  }
  const handle = await picker({
    suggestedName: "组织文件.zip",
    types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }],
  });
  return handle.createWritable();
}

interface SavePickerWindow {
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }) => Promise<{ createWritable(): Promise<ArchiveWritable> }>;
}

export async function packDownloadedFiles(
  directory: DownloadDirectoryHandle,
  files: { fileId: string; name: string; directories?: string[] }[],
  destination: ArchiveWritable,
): Promise<{ packed: number; missing: number }> {
  return writeStoredZip(
    destination,
    files.map((file) => ({
      fileId: file.fileId,
      name: file.name,
      directories: file.directories,
      open: async () => {
        try {
          const handle = await directory.getFileHandle(resourceFileName(file.fileId, file.name));
          return (await handle.getFile()).stream();
        } catch (error) {
          if (error instanceof DOMException && error.name === "NotFoundError") return null;
          throw error;
        }
      },
    })),
  );
}

export async function writeStoredZip(
  destination: ArchiveWritable,
  files: ArchiveSource[],
): Promise<{ packed: number; missing: number }> {
  const names = archiveEntryPaths(files);
  const stamp = dosStamp(new Date());
  const central: Uint8Array[] = [];
  let offset = 0;
  let packed = 0;
  let missing = 0;

  for (let index = 0; index < files.length; index += 1) {
    const source = files[index];
    if (!source) continue;
    const body = await source.open();
    if (!body) {
      missing += 1;
      continue;
    }
    if (packed >= ENTRY_LIMIT) throw new DirectoryAccessError("一次导出的文件过多");
    const name = new TextEncoder().encode(names[index] ?? source.fileId);
    const header = localHeader(name, stamp);
    await destination.write(header);
    const localOffset = offset;
    offset = advance(offset, header.byteLength);
    const written = await writeBody(destination, body);
    offset = advance(offset, written.size);
    const descriptor = dataDescriptor(written.crc, written.size);
    await destination.write(descriptor);
    offset = advance(offset, descriptor.byteLength);
    central.push(centralHeader(name, stamp, written.crc, written.size, localOffset));
    packed += 1;
  }

  const directoryBytes = concat(central);
  await destination.write(directoryBytes);
  await destination.write(endOfDirectory(packed, directoryBytes.byteLength, offset));
  return { packed, missing };
}

async function writeBody(
  destination: ArchiveWritable,
  body: ReadableStream<Uint8Array>,
): Promise<{ crc: number; size: number }> {
  const reader = body.getReader();
  let crc = 0xffffffff;
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      size = advance(size, value.byteLength);
      crc = updateCrc(crc, value);
      await destination.write(value);
    }
  } finally {
    reader.releaseLock();
  }
  return { crc: (crc ^ 0xffffffff) >>> 0, size };
}

function advance(current: number, amount: number): number {
  const next = current + amount;
  if (next > ZIP64_LIMIT) throw new DirectoryAccessError("文件超过压缩包可以容纳的大小");
  return next;
}

function dosStamp(date: Date): { time: number; date: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function localHeader(name: Uint8Array, stamp: { time: number; date: number }): Uint8Array {
  const bytes = new Uint8Array(30 + name.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0808, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, stamp.time, true);
  view.setUint16(12, stamp.date, true);
  view.setUint16(26, name.byteLength, true);
  bytes.set(name, 30);
  return bytes;
}

function dataDescriptor(crc: number, size: number): Uint8Array {
  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x08074b50, true);
  view.setUint32(4, crc, true);
  view.setUint32(8, size, true);
  view.setUint32(12, size, true);
  return bytes;
}

function centralHeader(
  name: Uint8Array,
  stamp: { time: number; date: number },
  crc: number,
  size: number,
  offset: number,
): Uint8Array {
  const bytes = new Uint8Array(46 + name.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0808, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, stamp.time, true);
  view.setUint16(14, stamp.date, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, name.byteLength, true);
  view.setUint32(42, offset, true);
  bytes.set(name, 46);
  return bytes;
}

function endOfDirectory(count: number, directorySize: number, directoryOffset: number): Uint8Array {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, directorySize, true);
  view.setUint32(16, directoryOffset, true);
  return bytes;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((total, part) => total + part.byteLength, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}

function updateCrc(crc: number, chunk: Uint8Array): number {
  let next = crc;
  for (const byte of chunk) next = CRC_TABLE[(next ^ byte) & 0xff]! ^ (next >>> 8);
  return next >>> 0;
}
