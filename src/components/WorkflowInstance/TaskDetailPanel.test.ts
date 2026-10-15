import { describe, expect, test } from "vite-plus/test";

import type { TaskInstanceDetailVO, TaskSubmissionVersionVO } from "@/types/workflowInstance";
import { submissionVersionAuthorLine, versionFromDetail } from "./TaskDetailPanel";

function detail(
  submission: TaskInstanceDetailVO["submission"],
  assignee?: TaskInstanceDetailVO["task"]["assignee"],
): TaskInstanceDetailVO {
  return {
    task: {
      id: "task-1",
      name: "翻译",
      stage: 1,
      status: "COMPLETED",
      assignee,
    },
    submission,
  };
}

describe("submissionVersionAuthorLine", () => {
  test("版本接口的 submitter 昵称显示在提交时间前", () => {
    const version: TaskSubmissionVersionVO = {
      versionNo: 2,
      status: "SUBMITTED",
      submittedAt: "2026-10-13 20:14:49",
      submitter: { id: "user-2", nickname: "小K" },
      fields: [],
      unreadable: false,
    };

    expect(submissionVersionAuthorLine(version)).toBe("小K · 2026-10-13 20:14:49");
  });

  test("没有提交人或提交时间时使用兜底文案", () => {
    expect(
      submissionVersionAuthorLine({
        submitter: { id: "user-2", nickname: null },
        submittedAt: null,
      }),
    ).toBe("未知 · 时间未知");
  });

  test("详情占位版本使用当前执行人作为提交人", () => {
    const [version] = versionFromDetail(
      detail(
        {
          state: "submitted",
          submittedAt: "2026-10-13 20:14:49",
          fields: [],
        },
        { id: "user-1", nickname: "阿岚" },
      ),
    );

    expect(version?.submitter?.nickname).toBe("阿岚");
    expect(submissionVersionAuthorLine(version!)).toBe("阿岚 · 2026-10-13 20:14:49");
  });

  test("未提交时不生成占位版本", () => {
    expect(versionFromDetail(detail({ state: "not_submitted", fields: [] }))).toEqual([]);
  });
});
