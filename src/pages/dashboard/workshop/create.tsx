import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface WorkflowNode {
  id: number;
  label: string;
  state: "done" | "active" | "pending";
  positionClassName: string;
}

const workflowNodes: WorkflowNode[] = [
  { id: 1, label: "创建", state: "done", positionClassName: "left-0 top-[156px]" },
  { id: 2, label: "翻译1", state: "done", positionClassName: "left-[204px] top-8" },
  { id: 3, label: "翻译2", state: "done", positionClassName: "left-[204px] top-[156px]" },
  { id: 4, label: "翻译3", state: "done", positionClassName: "left-[204px] top-[280px]" },
  { id: 5, label: "校对1", state: "active", positionClassName: "left-[408px] top-8" },
  { id: 6, label: "校对2", state: "active", positionClassName: "left-[408px] top-[156px]" },
  { id: 7, label: "校对3", state: "active", positionClassName: "left-[408px] top-[280px]" },
  { id: 8, label: "校对4", state: "active", positionClassName: "left-[408px] top-[404px]" },
  { id: 9, label: "审核", state: "pending", positionClassName: "left-[612px] top-[156px]" },
  { id: 10, label: "审核", state: "pending", positionClassName: "left-[816px] top-[156px]" },
];

const workflowLines = [
  "left-[124px] top-[210px]",
  "left-[328px] top-[210px]",
  "left-[532px] top-[210px]",
  "left-[736px] top-[210px]",
];

function WorkflowCanvasNode({ node }: { node: WorkflowNode }) {
  const isFilled = node.state === "done";
  const isPending = node.state === "pending";

  return (
    <button
      type="button"
      className={cn(
        "absolute flex size-[108px] items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
        node.positionClassName,
        isFilled && "border-foreground bg-foreground text-background",
        node.state === "active" && "border-foreground bg-card text-foreground",
        isPending && "border-muted bg-muted text-foreground",
      )}
    >
      {node.label}
    </button>
  );
}

export default function CreateWorkflowPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"info" | "tasks">("info");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  return (
    <div className="-m-6 flex min-h-[calc(100svh-3.5rem)] flex-col bg-background">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="返回"
          onClick={() => navigate("/dashboard/workshop/workflows")}
          className="text-muted-foreground"
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold leading-6 text-foreground">创建工作流程</h1>
        <div className="flex-1" />
        <Button type="button" className="h-10 w-24 rounded-xl text-base font-normal">
          更新
        </Button>
      </div>

      <div className="flex flex-1 gap-2.5 p-2.5">
        <section className="relative flex-1 overflow-hidden rounded-2xl border bg-card">
          <div className="absolute left-1/2 top-1/2 h-[544px] w-[924px] -translate-x-1/2 -translate-y-1/2">
            {workflowLines.map((line) => (
              <div key={line} className={cn("absolute h-0.5 w-16 bg-foreground", line)} />
            ))}
            {workflowNodes.map((node) => (
              <WorkflowCanvasNode key={node.id} node={node} />
            ))}
          </div>
        </section>

        <aside className="flex w-[360px] shrink-0 flex-col rounded-2xl border bg-card px-8 py-4">
          <div className="flex h-6 justify-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={cn(
                "border-b text-base leading-6",
                activeTab === "info"
                  ? "border-foreground font-bold text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              信息
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={cn(
                "border-b text-base leading-6",
                activeTab === "tasks"
                  ? "border-foreground font-bold text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              任务
            </button>
          </div>

          {activeTab === "info" ? (
            <div className="mt-8 flex flex-col gap-2.5">
              <label className="flex flex-col gap-2.5 text-base leading-6 text-foreground">
                流程名
                <Input
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  placeholder="请输入流程名"
                  className="h-8 rounded-none border-x-0 border-t-0 bg-transparent px-0 text-xl text-muted-foreground focus-visible:bg-transparent"
                />
              </label>

              <label className="mt-2.5 flex flex-col gap-2.5 text-base leading-6 text-foreground">
                简介
                <Textarea
                  value={formData.description}
                  onChange={(event) =>
                    setFormData({ ...formData, description: event.target.value })
                  }
                  className="h-[100px] resize-none rounded-xl border-0 bg-secondary"
                />
              </label>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-3">
              <Button type="button" variant="outline" className="h-10 justify-start gap-2">
                <Plus data-icon="inline-start" />
                添加任务
              </Button>
              <div className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
                选择画布节点后编辑任务信息
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
