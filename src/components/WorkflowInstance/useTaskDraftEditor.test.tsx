// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ApiError } from "@/api/apiError";
import { TASK_DRAFT_CONFLICT_MESSAGE } from "@/api/taskDraft";
import { $tip } from "@/components/tip";
import { createQueryClient } from "@/lib/queryClient";
import { scopedKey } from "@/lib/queryKeys";
import { clearSession, saveCurrentOrganization, saveSession } from "@/lib/session";
import { taskDraftQuery } from "@/queries/taskDraft";
import type { TaskDraftDetailVO } from "@/types/taskDraft";

import { useTaskDraftEditor, type TaskDraftEditor } from "./useTaskDraftEditor";

const api = vi.hoisted(() => ({
  getTaskDraft: vi.fn(),
  saveTaskDraft: vi.fn(),
  submitTaskDraft: vi.fn(),
  getTaskAttachmentDownload: vi.fn(),
}));
const preview = vi.hoisted(() => ({
  openAttachmentPreview: vi.fn(),
  closeAttachmentPreview: vi.fn(),
}));
vi.mock("@/components/AttachmentPreview/previewSession", () => preview);
vi.mock("@/api/workflowInstance", () => ({
  getTaskAttachmentDownload: api.getTaskAttachmentDownload,
}));
vi.mock("@/api/taskDraft", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/taskDraft")>()),
  ...api,
}));
vi.mock("@/components/tip", () => ({ $tip: vi.fn() }));
vi.mock("@/services/notification", () => ({ notificationService: { notify: vi.fn() } }));

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let editor: TaskDraftEditor;

function createDraftDetail(instanceId = "1"): TaskDraftDetailVO {
  return {
    task: { instanceId, itemId: "2", revision: "0", status: "CLAIMED" },
    canSubmit: true,
    submitFields: [{ key: "text", label: "文本", type: "text", required: true, options: [] }],
    draft: {
      id: "3",
      updatedAt: "2026-11-05 12:00:00",
      values: { text: "已暂存" },
      files: {},
    },
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function EditorProbe({ instanceId }: { instanceId: string }): null {
  editor = useTaskDraftEditor(instanceId);
  return null;
}

async function flushUpdates(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

async function renderEditor(instanceId = "1", duplicate = false): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <EditorProbe instanceId={instanceId} />
        {duplicate && <EditorProbe instanceId={instanceId} />}
      </QueryClientProvider>,
    );
  });
  await flushUpdates();
}

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.resetAllMocks();
  saveSession({ userId: "1", token: "token", defaultOrgId: "1", role: "ORG_OWNER" });
  client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  api.getTaskDraft.mockImplementation(async (instanceId: string) => createDraftDetail(instanceId));
});

afterEach(async (): Promise<void> => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  clearSession();
  vi.unstubAllGlobals();
});

test("restores saved fields and saves edits with their original revision", async () => {
  await renderEditor();
  expect(editor.values.text).toBe("已暂存");
  expect(editor.isDirty).toBe(false);
  await act(async () => editor.changeValue("text", "修改后"));
  const saved = createDraftDetail();
  saved.draft!.id = "4";
  saved.draft!.values = { text: "修改后" };
  api.saveTaskDraft.mockResolvedValue(saved);
  await act(async () => editor.saveDraft());
  await flushUpdates();
  expect(api.saveTaskDraft).toHaveBeenCalledExactlyOnceWith("1", {
    expectedTaskRevision: "0",
    expectedDraftId: "3",
    values: { text: "修改后" },
  });
  expect(editor.isDirty).toBe(false);
  expect(editor.hasConflict).toBe(false);
  expect(client.getQueryData(scopedKey(taskDraftQuery("1").key, "org"))).toEqual(saved);
  expect(api.getTaskDraft).toHaveBeenCalledTimes(1);
});

test("keeps local edits and stops writes after a revision conflict", async () => {
  await renderEditor();
  await act(async () => editor.changeValue("text", "不能丢失"));
  api.saveTaskDraft.mockRejectedValue(new ApiError(TASK_DRAFT_CONFLICT_MESSAGE, false, 5));
  await act(async () => editor.saveDraft());
  expect(editor.hasConflict).toBe(true);
  expect(editor.values.text).toBe("不能丢失");
  await act(async () => editor.saveDraft());
  expect(api.saveTaskDraft).toHaveBeenCalledTimes(1);
});

test("keeps ordinary operation failures retryable without marking a revision conflict", async () => {
  await renderEditor();
  await act(async () => editor.changeValue("text", "保留本地修改"));
  api.saveTaskDraft.mockRejectedValueOnce(
    new ApiError("操作失败,附件暂存超时，请重新暂存", false, 5),
  );
  await act(async () => editor.saveDraft());
  expect(editor.hasConflict).toBe(false);
  expect(editor.values.text).toBe("保留本地修改");
  const saved = createDraftDetail();
  saved.draft!.values = { text: "保留本地修改" };
  api.saveTaskDraft.mockResolvedValue(saved);
  await act(async () => editor.saveDraft());
  expect(api.saveTaskDraft).toHaveBeenCalledTimes(2);
  expect(editor.isDirty).toBe(false);
});

test("submits only saved revisions and invalidates task resources in the current organization", async () => {
  await renderEditor();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  await act(async () => editor.changeValue("text", "未保存"));
  await act(async () => {
    expect(await editor.submitDraft()).toBe(false);
  });
  expect(api.submitTaskDraft).not.toHaveBeenCalled();
  await act(async () => editor.reloadDraft());
  api.submitTaskDraft.mockResolvedValue({ status: "COMPLETED" });
  await act(async () => {
    expect(await editor.submitDraft()).toBe(true);
  });
  expect(api.submitTaskDraft).toHaveBeenCalledExactlyOnceWith("1", {
    expectedTaskRevision: "0",
    draftId: "3",
  });
  for (const key of [
    ["flow"],
    ["instances"],
    ["myTasks"],
    ["taskDetail"],
    ["taskVersions"],
    ["items"],
    ["projects"],
  ]) {
    expect(
      invalidate.mock.calls.some(
        ([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(scopedKey(key, "org")),
      ),
    ).toBe(true);
  }
});

test("allows a partial first save while waiting for predecessors", async () => {
  const empty = createDraftDetail();
  empty.canSubmit = false;
  empty.draft = null;
  api.getTaskDraft.mockResolvedValue(empty);
  api.saveTaskDraft.mockResolvedValue(createDraftDetail());
  await renderEditor();
  await act(async () => {
    expect(await editor.submitDraft()).toBe(false);
  });
  await act(async () => editor.saveDraft());
  expect(api.saveTaskDraft).toHaveBeenCalledExactlyOnceWith("1", {
    expectedTaskRevision: "0",
    expectedDraftId: null,
    values: {},
  });
});

test("preserves dirty fields across background refresh and adopts changes only on explicit reload", async () => {
  await renderEditor();
  await act(async () => editor.changeValue("text", "本地输入"));
  const refreshed = createDraftDetail();
  refreshed.draft!.id = "4";
  refreshed.draft!.values = { text: "其他窗口的修改" };
  await act(async () => {
    client.setQueryData(scopedKey(taskDraftQuery("1").key, "org"), refreshed);
  });
  await flushUpdates();
  expect(editor.values.text).toBe("本地输入");
  expect(editor.hasConflict).toBe(true);
  api.getTaskDraft.mockResolvedValue(refreshed);
  await act(async () => editor.reloadDraft());
  expect(editor.values.text).toBe("其他窗口的修改");
  expect(editor.hasConflict).toBe(false);
  expect(editor.isDirty).toBe(false);
});

test("retains edits when an explicit reload fails", async () => {
  await renderEditor();
  await act(async () => editor.changeValue("text", "仍然保留"));
  api.getTaskDraft.mockRejectedValue(new ApiError("读取失败", false, 5));
  await act(async () => editor.reloadDraft());
  expect(editor.values.text).toBe("仍然保留");
  expect(editor.isDirty).toBe(true);
});

test("ignores a late save result after switching to another task", async () => {
  await renderEditor();
  const pending = deferred<TaskDraftDetailVO>();
  api.saveTaskDraft.mockReturnValue(pending.promise);
  let saving!: Promise<void>;
  await act(async () => {
    saving = editor.saveDraft();
  });
  await renderEditor("another-task");
  await act(async () => {
    pending.resolve(createDraftDetail());
    await saving;
  });
  expect(editor.detail?.task.instanceId).toBe("another-task");
  expect(editor.values.text).toBe("已暂存");
  expect($tip).not.toHaveBeenCalled();
});

test("isolates editor values and queries when switching organizations", async () => {
  await renderEditor();
  await act(async () => editor.changeValue("text", "旧组织输入"));
  const anotherOrganization = createDraftDetail();
  anotherOrganization.draft!.values = { text: "新组织草稿" };
  api.getTaskDraft.mockResolvedValue(anotherOrganization);
  await act(async () => saveCurrentOrganization("2", "ORG_USER"));
  await flushUpdates();
  expect(editor.values.text).toBe("新组织草稿");
  expect(editor.isDirty).toBe(false);
  expect(client.getQueryData(scopedKey(taskDraftQuery("1").key, "org"))).toEqual(
    anotherOrganization,
  );
});

test("shares one query for simultaneous readers", async () => {
  await renderEditor("1", true);
  expect(api.getTaskDraft).toHaveBeenCalledTimes(1);
});

test("previews saved files using the existing task attachment download endpoint", async () => {
  const detail = createDraftDetail();
  detail.submitFields.push({
    key: "file",
    label: "附件",
    type: "file",
    required: false,
    options: [],
  });
  detail.draft!.values.file = { fileId: "99" };
  detail.draft!.files["99"] = {
    fileId: "99",
    fileName: "成果.txt",
    fileSize: 8,
    fileMime: "text/plain",
    availability: "available",
  };
  api.getTaskDraft.mockResolvedValue(detail);
  api.getTaskAttachmentDownload.mockResolvedValue({ readUrl: "/signed/file" });
  await renderEditor();
  editor.previewFile("file");
  const options = preview.openAttachmentPreview.mock.calls[0][0] as {
    resolveUrl: (signal: AbortSignal) => Promise<string>;
  };
  const signal = new AbortController().signal;
  expect(await options.resolveUrl(signal)).toBe("/signed/file");
  expect(api.getTaskAttachmentDownload).toHaveBeenCalledExactlyOnceWith("1", "99", signal);
  expect(api.getTaskDraft).toHaveBeenCalledTimes(1);
});

test("does not leave a disabled query in a loading state without a session", async () => {
  clearSession();
  await renderEditor();
  expect(api.getTaskDraft).not.toHaveBeenCalled();
  expect(editor.isLoading).toBe(false);
  expect(editor.detail).toBeNull();
});

test("prevents two simultaneous saves before pending state renders", async () => {
  await renderEditor();
  const pending = deferred<TaskDraftDetailVO>();
  api.saveTaskDraft.mockReturnValue(pending.promise);
  let saving!: Promise<void>;
  await act(async () => {
    saving = editor.saveDraft();
    void editor.saveDraft();
  });
  expect(api.saveTaskDraft).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve(createDraftDetail());
    await saving;
  });
});
