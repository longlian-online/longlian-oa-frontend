import { Controls, Panel } from "@xyflow/react";

export default function WorkflowViewportControls() {
  return (
    <>
      <Controls
        showInteractive={false}
        aria-label="画布导航"
        className="overflow-hidden rounded-lg border border-border [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground [&>button>svg]:!fill-current"
      />
      <Panel
        position="bottom-right"
        className="!pointer-events-none hidden rounded-md border bg-card/95 px-2.5 py-1.5 text-xs leading-5 text-muted-foreground sm:block"
      >
        <p>滚轮移动 · Ctrl / ⌘ + 滚轮缩放</p>
        <p>拖拽空白处移动 · 双指捏合缩放</p>
      </Panel>
    </>
  );
}
