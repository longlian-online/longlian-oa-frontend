import { expect, test } from "vite-plus/test";
import { buildDragPreviewScene } from "./dragPreview";
import type { WorkflowFlowNode } from "./WorkflowNode";

function node(id: string, x: number): WorkflowFlowNode {
  return {
    id,
    type: "workflow",
    position: { x, y: 80 },
    data: {
      label: id,
      taskName: id,
      stage: 1,
      parallelCount: 1,
      selected: false,
      onSelect: (): void => {},
      onRemove: (): void => {},
    },
  };
}

test("previews the resulting layout and connections while the dragged card follows the pointer", () => {
  const dragged = node("c", -40);
  const scene = buildDragPreviewScene(
    [node("a", 72), node("b", 388), dragged],
    [node("c", 72), node("a", 388), node("b", 704)],
    [
      { id: "c-a", source: "c", target: "a" },
      { id: "a-b", source: "a", target: "b" },
    ],
    "c",
  );
  expect(scene.nodes.find((item) => item.id === "c")?.position.x).toBe(-40);
  expect(scene.nodes.find((item) => item.id === "a")?.position.x).toBe(388);
  expect(scene.nodes.find((item) => item.id === "b")?.position.x).toBe(704);
  const landing = scene.nodes.find((item) => item.id === "workflow-preview-c");
  expect(landing?.position.x).toBe(72);
  expect(landing?.data.label).toBe("c");
  expect(scene.edges[0].source).toBe("workflow-preview-c");
  expect(scene.edges[1].source).toBe("a");
});

test("preserves measured card dimensions for projected nodes and the preview copy", () => {
  const original = { ...node("a", 72), measured: { width: 224, height: 96 } };
  const dragged = { ...node("c", 600), measured: { width: 224, height: 96 } };
  const scene = buildDragPreviewScene(
    [original, dragged],
    [node("c", 72), node("a", 388)],
    [],
    "c",
  );
  expect(scene.nodes.find((item) => item.id === "a")?.measured).toEqual(original.measured);
  const preview = scene.nodes.find((item) => item.id === "workflow-preview-c");
  expect(preview?.width).toBe(224);
  expect(preview?.height).toBe(96);
});

test("provides connection points on the preview card before DOM measurement", () => {
  const scene = buildDragPreviewScene([node("c", 600)], [node("c", 72)], [], "c");
  const preview = scene.nodes.find((item) => item.id === "workflow-preview-c");
  expect(preview?.handles).toEqual([
    { type: "target", position: "left", x: -3, y: 45, width: 6, height: 6 },
    { type: "source", position: "right", x: 221, y: 45, width: 6, height: 6 },
  ]);
});
