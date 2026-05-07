import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, BarChart3, CirclePlus, Share2, Link2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProjectDetailInfoVO } from "@/types/planning";
import { getProjectDetail } from "@/api/planning";

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetailInfoVO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      void loadProjectDetail();
    }
  }, [projectId]);

  async function loadProjectDetail() {
    try {
      setLoading(true);
      const data = await getProjectDetail(projectId!);
      setProject(data);
    } catch (error) {
      console.error("Failed to load project:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-muted-foreground py-8 text-center">加载中...</div>;
  }

  if (!project) {
    return <div className="text-muted-foreground py-8 text-center">企划不存在</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部返回栏 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate("/dashboard/planning")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">企划</span>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-6">
          {/* 左侧封面 */}
          <div className="w-100 shrink-0 space-y-4">
            <div className="aspect-2/3 rounded-lg overflow-hidden bg-muted">
              {project.coverUrl ? (
                <img
                  src={project.coverUrl}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  暂无封面
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
                <CirclePlus className="h-3.5 w-3.5" />
                添加到工坊
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Share2 className="h-3.5 w-3.5" />
                分享
              </Button>
            </div>
          </div>

          {/* 右侧信息 */}
          <div className="flex-1 mx-4 max-w-200 space-y-5">
            {/* 标题 */}
            <div>
              <h1 className="text-xl font-semibold">{project.title}</h1>
              {project.alias && (
                <p className="text-sm text-muted-foreground mt-1">{project.alias}</p>
              )}
            </div>

            {/* 统计 */}
            <div className="flex justify-between px-12 py-3 border-y">
              {/* 进度 */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  进度
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-semibold">{project.progressPercent}%</span>
                  <Progress value={project.progressPercent} className="w-24 h-1.5 self-center" />
                </div>
              </div>

              {/* 待提交 */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  待提交
                </div>
                <span className="text-xl font-semibold leading-tight">
                  {project.claimedTaskCount}
                </span>
              </div>

              {/* 待接取 */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  待接取
                </div>
                <span className="text-xl font-semibold leading-tight">
                  {project.pendingTaskCount}
                </span>
              </div>
            </div>

            {/* 信息 - 使用 Badge */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                信息
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  原作者 <span className="text-foreground ml-1">未知</span>
                </Badge>
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  状态{" "}
                  <span className="text-foreground ml-1">
                    {project.status === "COMPLETED"
                      ? "已完结"
                      : project.status === "IN_PROGRESS"
                        ? "进行中"
                        : "已归档"}
                  </span>
                </Badge>
              </div>
            </div>

            {/* 简介 */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                简介
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {project.description || "暂无简介"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
