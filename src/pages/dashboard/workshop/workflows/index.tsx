import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BadgeCheck,
  ChevronRight,
  Languages,
  Megaphone,
  Plus,
  Search,
  SquarePen,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WorkflowType = "小说" | "漫画" | "视频" | "美术";

interface WorkflowStep {
  label: string;
  icon: typeof Star;
  parallelCount: number;
}

interface WorkflowTemplate {
  id: number;
  name: string;
  type: WorkflowType;
  projectName: string;
  taskCount: number;
  createdByMe: boolean;
  steps: WorkflowStep[];
}

const typeTabs = ["全部", "小说", "漫画", "视频", "美术"] as const;

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 1,
    name: "并行翻译小说流程",
    type: "小说",
    projectName: "佐久间巡警和花冈巡警开始交往了",
    taskCount: 15,
    createdByMe: true,
    steps: [
      { label: "创建", icon: BadgeCheck, parallelCount: 1 },
      { label: "翻译", icon: Languages, parallelCount: 2 },
      { label: "校对", icon: Languages, parallelCount: 1 },
      { label: "审核", icon: SquarePen, parallelCount: 1 },
      { label: "发布", icon: Megaphone, parallelCount: 1 },
    ],
  },
  {
    id: 2,
    name: "漫画流程",
    type: "漫画",
    projectName: "佐久间巡警和花冈巡警开始交往了",
    taskCount: 15,
    createdByMe: true,
    steps: [
      { label: "创建", icon: BadgeCheck, parallelCount: 1 },
      { label: "翻译", icon: Languages, parallelCount: 1 },
      { label: "校对", icon: Languages, parallelCount: 1 },
      { label: "审核", icon: SquarePen, parallelCount: 1 },
      { label: "发布", icon: Megaphone, parallelCount: 1 },
    ],
  },
  {
    id: 3,
    name: "常规小说流程",
    type: "小说",
    projectName: "佐久间巡警和花冈巡警开始交往了",
    taskCount: 15,
    createdByMe: true,
    steps: [
      { label: "创建", icon: BadgeCheck, parallelCount: 1 },
      { label: "翻译", icon: Languages, parallelCount: 1 },
      { label: "校对", icon: Languages, parallelCount: 1 },
      { label: "审核", icon: SquarePen, parallelCount: 1 },
      { label: "发布", icon: Megaphone, parallelCount: 1 },
    ],
  },
  {
    id: 4,
    name: "并行翻译小说流程",
    type: "小说",
    projectName: "佐久间巡警和花冈巡警开始交往了",
    taskCount: 15,
    createdByMe: true,
    steps: [
      { label: "创建", icon: BadgeCheck, parallelCount: 1 },
      { label: "翻译", icon: Languages, parallelCount: 2 },
      { label: "校对", icon: Languages, parallelCount: 1 },
      { label: "审核", icon: SquarePen, parallelCount: 1 },
      { label: "发布", icon: Megaphone, parallelCount: 1 },
    ],
  },
  {
    id: 5,
    name: "漫画流程",
    type: "漫画",
    projectName: "佐久间巡警和花冈巡警开始交往了",
    taskCount: 15,
    createdByMe: true,
    steps: [
      { label: "创建", icon: BadgeCheck, parallelCount: 1 },
      { label: "翻译", icon: Languages, parallelCount: 1 },
      { label: "校对", icon: Languages, parallelCount: 1 },
      { label: "审核", icon: SquarePen, parallelCount: 1 },
      { label: "发布", icon: Megaphone, parallelCount: 1 },
    ],
  },
];

function WorkflowParallelBadge({ count }: { count: number }) {
  if (count <= 1) {
    return <div className="mt-1 h-5" />;
  }

  return (
    <div className="mt-1 flex h-4 items-center justify-center">
      <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] font-bold leading-4 text-background">
        +{count}
      </span>
    </div>
  );
}

function WorkflowDiagram({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="flex w-full min-w-0 items-start justify-center px-1">
      {steps.map((step, index) => {
        const Icon = step.icon;

        return (
          <div key={`${step.label}-${index}`} className="flex min-w-0 flex-1 items-start">
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
                <Icon className="size-3.5" />
              </div>
              <WorkflowParallelBadge count={step.parallelCount} />
              <div className="mt-1 max-w-10 truncate text-[11px] font-bold leading-4 text-muted-foreground">
                {step.label}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="mt-4 h-0.5 w-5 shrink-0 bg-foreground" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkflowCard({ workflow }: { workflow: WorkflowTemplate }) {
  return (
    <article className="flex h-[220px] min-w-0 flex-col rounded-2xl bg-card px-5 py-5 shadow-sm">
      <h2 className="truncate text-lg font-bold leading-6 text-foreground">{workflow.name}</h2>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        <WorkflowDiagram steps={workflow.steps} />
      </div>

      <div className="flex items-center justify-between text-xs leading-[18px]">
        <div className="text-foreground">• 任务数：{workflow.taskCount}</div>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
          查看详情
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </article>
  );
}

function CreateWorkflowCard() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard/workshop/create")}
      className="flex h-[220px] min-w-0 flex-col items-center justify-center rounded-2xl bg-card text-center shadow-sm transition-colors hover:bg-secondary/40"
    >
      <div className="flex size-11 items-center justify-center rounded-full border-[3px] border-muted-foreground text-muted-foreground">
        <Plus className="size-6" />
      </div>
      <div className="mt-3 text-sm font-medium leading-5 text-foreground">创建新流程</div>
      <div className="mt-1 text-xs leading-[18px] text-muted-foreground">点击开始一个新的流程</div>
    </button>
  );
}

export default function WorkshopPage() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<(typeof typeTabs)[number]>("全部");
  const [createdByMeOnly, setCreatedByMeOnly] = useState(true);
  const [keyword, setKeyword] = useState("佐久间");

  const filteredWorkflows = useMemo(() => {
    return workflowTemplates.filter((workflow) => {
      const matchesType = activeType === "全部" || workflow.type === activeType;
      const matchesOwner = !createdByMeOnly || workflow.createdByMe;
      const matchesKeyword =
        !keyword ||
        workflow.name.includes(keyword) ||
        workflow.type.includes(keyword) ||
        workflow.projectName.includes(keyword);

      return matchesType && matchesOwner && matchesKeyword;
    });
  }, [activeType, createdByMeOnly, keyword]);

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {typeTabs.map((type) => (
            <Button
              key={type}
              type="button"
              variant="ghost"
              className={cn(
                "h-8 rounded-lg px-3 text-sm font-normal",
                activeType === type && "bg-secondary font-bold",
              )}
              onClick={() => setActiveType(type)}
            >
              {type}
            </Button>
          ))}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className="h-8 rounded-lg px-3 text-sm font-bold"
            onClick={() => navigate("/dashboard/workshop/workflows")}
          >
            工作流
          </Button>

          <label className="flex h-6 items-center gap-1 text-sm text-foreground">
            <input
              type="checkbox"
              checked={createdByMeOnly}
              onChange={(event) => setCreatedByMeOnly(event.target.checked)}
              className="size-4 accent-foreground"
            />
            我创建的
          </label>

          <div className="relative w-56 max-w-full">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索"
              className="h-8 rounded-lg border-0 bg-secondary pl-9 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <CreateWorkflowCard />
        {filteredWorkflows.map((workflow) => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </div>
  );
}
