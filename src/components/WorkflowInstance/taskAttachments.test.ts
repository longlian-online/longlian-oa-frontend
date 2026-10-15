import { describe, expect, test, vi } from "vite-plus/test";

import type { TaskAttachment, TaskDetailField } from "@/types/workflowInstance";
import { AttachmentOpenError, openTaskAttachment, type AttachmentPopup } from "./taskAttachments";

const attachment = (id: string, expiresAt: number, readUrl: string): TaskAttachment => ({
  id,
  name: `${id}.png`,
  availability: "available",
  sizeText: "12 KB",
  mediaType: "image",
  readUrl,
  expiresAt,
});

function fieldsOf(file: TaskAttachment | null, other?: TaskAttachment | null): TaskDetailField[] {
  return [
    { key: "deliverable", label: "交付物", type: "file", file },
    ...(other === undefined
      ? []
      : [{ key: "other", label: "其他", type: "file" as const, file: other }]),
  ];
}

function setup(fields: TaskDetailField[] = fieldsOf(null)) {
  const navigate = vi.fn<(url: string) => void>();
  const close = vi.fn<() => void>();
  const popup: AttachmentPopup = { navigate, close, isClosed: () => false };
  const options = {
    now: () => 100,
    openPopup: vi.fn<() => AttachmentPopup | null>(() => popup),
    loadFields: vi.fn<() => Promise<TaskDetailField[]>>(async () => fields),
    isCurrent: () => true,
  };
  return { options, navigate, close };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

describe("signed task attachment opening", () => {
  test("opens a fresh URL without requesting another field refresh", async () => {
    const { options, navigate, close } = setup();
    await openTaskAttachment(attachment("file", 111, "https://cdn.test/current"), options);
    expect(options.loadFields).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("https://cdn.test/current");
    expect(close).not.toHaveBeenCalled();
  });

  test("reserves the popup before refreshing the ten-second boundary and finds the same ID", async () => {
    const pending = deferred<TaskDetailField[]>();
    const { options, navigate } = setup();
    options.loadFields.mockReturnValue(pending.promise);
    const operation = openTaskAttachment(attachment("file", 110, "https://cdn.test/old"), options);
    expect(options.openPopup).toHaveBeenCalledTimes(1);
    expect(options.loadFields).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    pending.resolve(
      fieldsOf(
        attachment("file", 300, "https://cdn.test/fresh"),
        attachment("other", 300, "https://cdn.test/other"),
      ),
    );
    await operation;
    expect(navigate).toHaveBeenCalledWith("https://cdn.test/fresh");
  });

  test("selection changes close the reserved tab without navigating on stale fields", async () => {
    const pending = deferred<TaskDetailField[]>();
    const { options, navigate, close } = setup();
    let current = true;
    options.isCurrent = () => current;
    options.loadFields.mockReturnValue(pending.promise);
    const operation = openTaskAttachment(attachment("file", 100, "https://cdn.test/old"), options);
    current = false;
    pending.resolve(fieldsOf(attachment("file", 300, "https://cdn.test/fresh")));
    await operation;
    expect(navigate).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("a removed attachment never opens a different file", async () => {
    const { options, navigate, close } = setup(
      fieldsOf(attachment("other", 300, "https://cdn.test/other")),
    );
    await expect(
      openTaskAttachment(attachment("file", 100, "https://cdn.test/old"), options),
    ).rejects.toThrow("附件已不可用");
    expect(navigate).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("an unavailable refreshed attachment does not reuse the old URL", async () => {
    const { options, navigate, close } = setup(
      fieldsOf({ id: "file", name: "file.png", availability: "unavailable" }),
    );
    await expect(
      openTaskAttachment(attachment("file", 100, "https://cdn.test/old"), options),
    ).rejects.toBeInstanceOf(AttachmentOpenError);
    expect(navigate).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("failed refresh closes the reserved tab and makes no automatic retry", async () => {
    const { options, navigate, close } = setup();
    options.loadFields.mockRejectedValue(new Error("network failure"));
    await expect(
      openTaskAttachment(attachment("file", 100, "https://cdn.test/old"), options),
    ).rejects.toThrow("network failure");
    expect(options.loadFields).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("an expired refreshed link fails visibly rather than looping", async () => {
    const { options, navigate, close } = setup(
      fieldsOf(attachment("file", 100, "https://cdn.test/stale")),
    );
    await expect(
      openTaskAttachment(attachment("file", 100, "https://cdn.test/old"), options),
    ).rejects.toThrow("附件链接未能更新");
    expect(options.loadFields).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("a reused signed link that is still valid opens even inside the refresh margin", async () => {
    const { options, navigate } = setup(
      fieldsOf(attachment("file", 105, "https://cdn.test/reused")),
    );
    await openTaskAttachment(attachment("file", 105, "https://cdn.test/reused"), options);
    expect(options.loadFields).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("https://cdn.test/reused");
  });

  test("popup blocking is reported before making a refresh request", async () => {
    const { options } = setup();
    options.openPopup.mockReturnValue(null);
    await expect(
      openTaskAttachment(attachment("file", 100, "https://cdn.test/old"), options),
    ).rejects.toThrow("浏览器阻止了附件窗口");
    expect(options.loadFields).not.toHaveBeenCalled();
  });

  test("closing the reserved popup during refresh prevents navigation", async () => {
    const pending = deferred<TaskDetailField[]>();
    const { options, navigate, close } = setup();
    options.openPopup.mockReturnValue({ navigate, close, isClosed: () => true });
    options.loadFields.mockReturnValue(pending.promise);
    const operation = openTaskAttachment(attachment("file", 100, "https://cdn.test/old"), options);
    pending.resolve(fieldsOf(attachment("file", 300, "https://cdn.test/fresh")));
    await expect(operation).rejects.toThrow("附件窗口已关闭");
    expect(navigate).not.toHaveBeenCalled();
  });
});
