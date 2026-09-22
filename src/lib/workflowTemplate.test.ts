import { describe, expect, test } from "vite-plus/test";

import { toWorkflowTemplateNodes } from "./workflowTemplate";

describe("toWorkflowTemplateNodes", () => {
  test("maps organization nodes to editor nodes and drops incomplete nodes", () => {
    expect(
      toWorkflowTemplateNodes([
        { baseTaskId: "a", baseTaskName: "翻译", sort: 1, parallelSort: 1 },
        { baseTaskId: undefined, sort: 2 },
      ]),
    ).toEqual([{ baseTaskId: "a", baseTaskName: "翻译", sort: 1, parallelSort: 1 }]);
  });
});
