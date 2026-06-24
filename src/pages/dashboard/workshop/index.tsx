import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WorkshopType = "小说" | "漫画" | "视频" | "美术";

interface WorkshopProject {
  id: number;
  title: string;
  type: WorkshopType;
  creatorName: string;
  submittedAt: string;
  avatarUrl: string;
  createdByMe: boolean;
}

const typeTabs = ["全部", "小说", "漫画", "视频", "美术"] as const;

const workshopProjects: WorkshopProject[] = [
  {
    id: 1,
    title: "学生会长的百合事情",
    type: "小说",
    creatorName: "暮居池",
    submittedAt: "2025-01-25",
    avatarUrl: "https://picsum.photos/seed/workshop-user-1/80/80",
    createdByMe: true,
  },
  {
    id: 2,
    title: "学生会长的百合事情",
    type: "漫画",
    creatorName: "暮居池",
    submittedAt: "2025-01-25",
    avatarUrl: "https://picsum.photos/seed/workshop-user-2/80/80",
    createdByMe: true,
  },
  {
    id: 3,
    title: "学生会长的百合事情",
    type: "小说",
    creatorName: "暮居池",
    submittedAt: "2025-01-25",
    avatarUrl: "https://picsum.photos/seed/workshop-user-3/80/80",
    createdByMe: true,
  },
  {
    id: 4,
    title: "学生会长的百合事情",
    type: "视频",
    creatorName: "暮居池",
    submittedAt: "2025-01-25",
    avatarUrl: "https://picsum.photos/seed/workshop-user-4/80/80",
    createdByMe: true,
  },
];

function WorkshopProjectCard({ project }: { project: WorkshopProject }) {
  return (
    <article className="flex h-[220px] flex-col rounded-2xl border bg-card px-[23px] py-[19px]">
      <div className="flex h-20 items-start gap-2.5">
        <Avatar className="size-20">
          <AvatarImage src={project.avatarUrl} />
          <AvatarFallback>{project.title.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 pt-3.5">
          <h2 className="truncate text-base leading-6 text-foreground">{project.title}</h2>
          <p className="mt-2.5 truncate text-xs leading-[18px] text-muted-foreground">
            {project.creatorName} | 提交于 {project.submittedAt}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-1 items-end justify-end">
        <Button variant="ghost" size="sm" className="h-[34px] gap-1 px-2 text-xs">
          查看企划
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </article>
  );
}

export default function WorkshopPage() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<(typeof typeTabs)[number]>("全部");
  const [createdByMeOnly, setCreatedByMeOnly] = useState(true);
  const [keyword, setKeyword] = useState("佐久间");

  const filteredProjects = useMemo(() => {
    return workshopProjects.filter((project) => {
      const matchesType = activeType === "全部" || project.type === activeType;
      const matchesOwner = !createdByMeOnly || project.createdByMe;
      const matchesKeyword =
        !keyword ||
        project.title.includes(keyword) ||
        project.creatorName.includes(keyword) ||
        project.type.includes(keyword);

      return matchesType && matchesOwner && matchesKeyword;
    });
  }, [activeType, createdByMeOnly, keyword]);

  const visibleProjects = filteredProjects.length > 0 ? filteredProjects : workshopProjects;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex h-[60px] items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 p-2.5">
          {typeTabs.map((type) => (
            <Button
              key={type}
              type="button"
              variant="ghost"
              className={cn(
                "h-10 rounded-xl px-4 text-base font-normal",
                activeType === type && "bg-secondary font-bold",
              )}
              onClick={() => setActiveType(type)}
            >
              {type}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-4 text-base font-normal"
            onClick={() => navigate("/dashboard/workshop/workflows")}
          >
            工作流
          </Button>

          <label className="flex h-6 items-center gap-1 text-base text-foreground">
            <input
              type="checkbox"
              checked={createdByMeOnly}
              onChange={(event) => setCreatedByMeOnly(event.target.checked)}
              className="size-4 accent-foreground"
            />
            我创建的
          </label>

          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索"
              className="h-8 rounded-xl border-0 bg-secondary pl-10 text-base"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-[15px] xl:grid-cols-4">
        {visibleProjects.map((project) => (
          <WorkshopProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
