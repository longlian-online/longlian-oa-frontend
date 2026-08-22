import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CirclePlus,
  Info,
  Link2,
  Loader2,
  Pencil,
  Share2,
  X,
} from "lucide-react";

import {
  addProjectToWorkshop,
  getProjectDetail,
  removeProjectFromWorkshop,
  updateProject,
} from "@/api/planning";
import FileUpload from "@/components/FileUpload";
import ProjectItemSection from "@/components/ProjectItem";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/useConfirm";
import type { UploadedFileInfo } from "@/types/file";
import type { ProjectDetailInfoVO, ProjectStatus } from "@/types/planning";

interface TagItem {
  key: string;
  value: string;
}

interface ProjectEditForm {
  title: string;
  alias: string;
  description: string;
  metadata: string;
}

function getStatusLabel(status: ProjectStatus): string {
  if (status === "COMPLETED" || status === "已完成") return "已完成";
  if (status === "ARCHIVED" || status === "已归档") return "已归档";
  return "进行中";
}

function parseMetadataTags(metadata?: string): TagItem[] {
  if (!metadata) return [];
  try {
    const parsed = JSON.parse(metadata) as { tags?: TagItem[] };
    return Array.isArray(parsed.tags) ? parsed.tags : [];
  } catch {
    return [];
  }
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [project, setProject] = useState<ProjectDetailInfoVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshopLoading, setWorkshopLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<UploadedFileInfo | null>(null);
  const [editForm, setEditForm] = useState<ProjectEditForm>({
    title: "",
    alias: "",
    description: "",
    metadata: "",
  });

  useEffect(() => {
    if (projectId) {
      void loadProjectDetail();
    }
  }, [projectId]);

  async function loadProjectDetail(): Promise<void> {
    try {
      setLoading(true);
      const data = await getProjectDetail(projectId!);
      setProject(data);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "企划加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function openEditDialog(): void {
    if (!project) return;
    setEditForm({
      title: project.title,
      alias: project.alias ?? "",
      description: project.description ?? "",
      metadata: project.metadata ?? JSON.stringify({ tags: [] }),
    });
    setCoverFile(null);
    setEditOpen(true);
  }

  async function handleUpdateProject(): Promise<void> {
    if (!projectId || !editForm.title.trim()) return;

    try {
      setSaving(true);
      await updateProject(projectId, {
        title: editForm.title.trim(),
        alias: editForm.alias.trim() || editForm.title.trim(),
        description: editForm.description.trim(),
        metadata: editForm.metadata.trim() || "{}",
        coverFileId: coverFile?.fileId,
      });
      $tip("企划已更新", "success");
      setEditOpen(false);
      await loadProjectDetail();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "企划更新失败", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleWorkshop(): Promise<void> {
    if (!project || !projectId) return;

    if (project.inWorkshop) {
      const confirmed = await confirm({
        title: "从工坊移除企划？",
        description: "移除后可以在企划详情里重新添加。",
        confirmText: "移除",
      });
      if (!confirmed) return;
    }

    try {
      setWorkshopLoading(true);
      if (project.inWorkshop) {
        await removeProjectFromWorkshop(projectId);
        $tip("已从工坊移除", "success");
      } else {
        await addProjectToWorkshop(projectId);
        $tip("已添加到工坊", "success");
      }
      await loadProjectDetail();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "工坊状态更新失败", "error");
    } finally {
      setWorkshopLoading(false);
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">加载中...</div>;
  }

  if (!project) {
    return <div className="py-8 text-center text-muted-foreground">企划不存在</div>;
  }

  const tags = parseMetadataTags(project.metadata);
  const statusLabel = getStatusLabel(project.status);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="返回企划列表"
            onClick={() => navigate("/dashboard/planning")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {project.title}
              </h1>
              <Badge variant="outline">{statusLabel}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {project.alias || project.typeName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.isCreator && (
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Pencil className="h-4 w-4" />
              编辑
            </Button>
          )}
          <Button
            variant={project.inWorkshop ? "secondary" : "default"}
            size="sm"
            disabled={workshopLoading}
            onClick={handleToggleWorkshop}
          >
            {workshopLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : project.inWorkshop ? (
              <X className="h-4 w-4" />
            ) : (
              <CirclePlus className="h-4 w-4" />
            )}
            {project.inWorkshop ? "移出工坊" : "添加到工坊"}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Share2 className="h-4 w-4" />
            分享
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="aspect-[2/3] bg-muted">
              {project.coverUrl ? (
                <img
                  src={project.coverUrl}
                  alt={project.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  暂无封面
                </div>
              )}
            </div>
          </div>

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Info className="h-4 w-4 text-muted-foreground" />
              基础信息
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">类型</span>
                <span className="font-medium text-foreground">{project.typeName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">状态</span>
                <span className="font-medium text-foreground">{statusLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">工坊</span>
                <span className="font-medium text-foreground">
                  {project.inWorkshop ? "已添加" : "未添加"}
                </span>
              </div>
            </div>
          </section>
        </aside>

        <main className="space-y-4">
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  进度
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{project.progressPercent}%</span>
                  <Progress value={project.progressPercent} className="h-1.5 flex-1" />
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">待提交</div>
                <div className="mt-2 text-2xl font-semibold">{project.claimedTaskCount}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">待接取</div>
                <div className="mt-2 text-2xl font-semibold">{project.pendingTaskCount}</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              简介
            </div>
            <p className="text-sm leading-7 text-foreground">{project.description || "暂无简介"}</p>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Info className="h-4 w-4 text-muted-foreground" />
              元信息
            </div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={`${tag.key}-${index}`} variant="outline" className="font-normal">
                    <span className="text-muted-foreground">{tag.key}</span>
                    <span className="ml-1 text-foreground">{tag.value}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无元信息</p>
            )}
          </section>

          <ProjectItemSection
            projectId={projectId!}
            isCreator={project.isCreator}
            onChanged={loadProjectDetail}
          />
        </main>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑企划</DialogTitle>
            <DialogDescription>更新基础信息；如需更换封面，请重新上传图片。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
            <FileUpload
              bizType="cover"
              bizId={projectId ?? String(project.id)}
              value={coverFile}
              title="更换封面"
              description="不上传则保留原封面"
              imagePreview
              accept={["jpg", "jpeg", "png", "gif"]}
              maxSize={10 * 1024 * 1024}
              className="[&>button]:min-h-[270px]"
              onChange={setCoverFile}
            />

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">企划名</label>
                <Input
                  value={editForm.title}
                  onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">别名</label>
                <Input
                  value={editForm.alias}
                  onChange={(event) => setEditForm({ ...editForm, alias: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">简介</label>
                <Textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm({ ...editForm, description: event.target.value })
                  }
                  className="min-h-24 resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">元信息 JSON</label>
                <Textarea
                  value={editForm.metadata}
                  onChange={(event) => setEditForm({ ...editForm, metadata: event.target.value })}
                  className="min-h-24 resize-none font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button disabled={saving || !editForm.title.trim()} onClick={handleUpdateProject}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
