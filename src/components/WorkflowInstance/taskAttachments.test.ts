import { describe, expect, test, vi } from "vite-plus/test";

import type { TaskAttachment } from "@/types/workflowInstance";
import { AttachmentOpenError, openTaskAttachment, type AttachmentPopup } from "./taskAttachments";

const attachment = (id: string): TaskAttachment => ({
  id,
  name: `${id}.png`,
  availability: "available",
  sizeText: "12 KB",
  mediaType: "image",
});

function setup() {
  const navigate = vi.fn<(url: string) => void>();
  const close = vi.fn<() => void>();
  const popup: AttachmentPopup = { navigate, close, isClosed: () => false };
  const options = {
    openPopup: vi.fn<() => AttachmentPopup | null>(() => popup),
    loadUrl: vi.fn(async () => "https://cdn.test/fresh"),
    isCurrent: () => true,
  };
  return { options, navigate, close };
}

describe("task attachment opening", () => {
  test("opens the url returned at click time", async () => {
    const { options, navigate, close } = setup();
    await openTaskAttachment(attachment("file"), options);
    expect(options.openPopup).toHaveBeenCalledTimes(1);
    expect(options.loadUrl).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("https://cdn.test/fresh");
    expect(close).not.toHaveBeenCalled();
  });

  test("reports a blocked popup before requesting a url", async () => {
    const { options, navigate } = setup();
    options.openPopup.mockReturnValue(null);
    await expect(openTaskAttachment(attachment("file"), options)).rejects.toThrow(
      "浏览器阻止了附件窗口",
    );
    expect(options.loadUrl).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  test("leaving the task closes the tab without navigating", async () => {
    const { options, navigate, close } = setup();
    let current = true;
    options.isCurrent = () => current;
    options.loadUrl.mockImplementation(async () => {
      current = false;
      return "https://cdn.test/fresh";
    });
    await openTaskAttachment(attachment("file"), options);
    expect(navigate).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("a closed tab does not navigate", async () => {
    const { options, navigate, close } = setup();
    options.openPopup.mockReturnValue({ navigate, close, isClosed: () => true });
    await expect(openTaskAttachment(attachment("file"), options)).rejects.toThrow("附件窗口已关闭");
    expect(navigate).not.toHaveBeenCalled();
  });

  test("an unavailable attachment does not open a tab", async () => {
    const { options } = setup();
    await expect(
      openTaskAttachment({ id: "file", name: "file.png", availability: "unavailable" }, options),
    ).rejects.toBeInstanceOf(AttachmentOpenError);
    expect(options.openPopup).not.toHaveBeenCalled();
  });

  test("a failed url request closes the tab and does not retry", async () => {
    const { options, navigate, close } = setup();
    options.loadUrl.mockRejectedValue(new Error("network failure"));
    await expect(openTaskAttachment(attachment("file"), options)).rejects.toThrow(
      "network failure",
    );
    expect(options.loadUrl).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
