import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Check, Info, Loader2 } from "lucide-react";

import { createProject, updateProject } from "@/api/planning";
import FileUpload from "@/components/FileUpload";
import ProjectMetadataEditor from "@/components/ProjectMetadataEditor";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import { getStatusLabel } from "@/lib/projectStatus";
import { cn } from "@/lib/utils";
import { getCurrentOrgId } from "@/lib/session";
import { parseProjectMetadataTags } from "@/lib/projectMetadata";
import type { UploadedFileInfo } from "@/types/file";
import type { ProjectDetailInfoVO, ProjectStatus } from "@/types/planning";
import type { EditableProjectMetadataTag } from "@/components/ProjectMetadataEditor";
import type { ProjectMetadataTag } from "@/lib/projectMetadata";

const fieldClassName =
  "border-border/70 bg-muted/20 shadow-none focus-visible:border-foreground/30 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-foreground/10";

interface CreateProjectProps {
  project?: ProjectDetailInfoVO;
}

export default function CreateProject({ project }: CreateProjectProps) {
  const navigate = useNavigate();
  const { projectTypes, loading: loadingProjectTypes } = useProjectTypes();
  const isEditing = Boolean(project);
  const coverBizId = project ? String(project.id) : (getCurrentOrgId() ?? "cover");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: project?.title ?? "",
    alias: project?.alias ?? "",
    typeId: "",
    description: project?.description ?? "",
    status: project ? getStatusLabel(project.status) : "",
  });
  const [tags, setTags] = useState<EditableProjectMetadataTag[]>(() =>
    parseProjectMetadataTags(project?.metadata).map((tag) => ({ ...tag, id: crypto.randomUUID() })),
  );
  const [tagDraft, setTagDraft] = useState<ProjectMetadataTag>({ key: "", value: "" });
  const [coverFile, setCoverFile] = useState<UploadedFileInfo | null>(
    project?.coverUrl
      ? {
          fileId: "",
          fileName: project.title,
          fileSize: 0,
          fileMime: "image/*",
          previewUrl: project.coverUrl,
        }
      : null,
  );
  const selectedProjectType = projectTypes.find((type) => type.id === formData.typeId);

  const canSubmit = Boolean(formData.title && formData.typeId && (isEditing || coverFile?.fileId));

  useEffect(() => {
    if (!project || formData.typeId || projectTypes.length === 0) return;
    const matchedType = projectTypes.find((type) => type.name === project.typeName);
    if (matchedType) {
      setFormData((current) => ({ ...current, typeId: matchedType.id }));
    }
  }, [formData.typeId, project, projectTypes]);

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || (!isEditing && !coverFile)) return;

    const pendingTagKey = tagDraft.key.trim();
    const pendingTagValue = tagDraft.value.trim();
    if (!pendingTagKey && pendingTagValue) {
      $tip("请填写标签名", "error");
      return;
    }

    const submittedTags: ProjectMetadataTag[] = tags.map(({ key, value, color }) => ({
      key,
      value,
      color,
    }));
    if (pendingTagKey) {
      submittedTags.push({ key: pendingTagKey, value: pendingTagValue, color: tagDraft.color });
    }

    try {
      setLoading(true);
      if (isEditing && project) {
        await updateProject(project.id, {
          title: formData.title.trim(),
          alias: formData.alias.trim() || formData.title.trim(),
          description: formData.description.trim(),
          metadata: JSON.stringify({ tags: submittedTags }),
          coverFileId: coverFile?.fileId || undefined,
          status:
            formData.status === "进行中" || formData.status === "已完成"
              ? formData.status
              : undefined,
        });
        $tip("企划已更新", "success");
        void navigate(`/dashboard/planning/${project.id}`);
      } else if (coverFile) {
        await createProject({
          title: formData.title.trim(),
          alias: formData.alias.trim() || formData.title.trim(),
          typeId: formData.typeId,
          description: formData.description.trim(),
          coverFileId: coverFile.fileId,
          metadata: JSON.stringify({ tags: submittedTags }),
        });
        $tip("企划创建成功", "success");
        void navigate("/dashboard/planning");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {isEditing ? "编辑企划" : "发布新企划"}
              </h1>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isEditing ? "更新基础信息、封面与标签。" : "填写基础信息、封面与标签。"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="min-w-24"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isEditing ? "保存修改" : "创建企划"}
          </Button>
        </div>
      </div>

      <div className="grid items-start justify-center gap-4 lg:items-stretch lg:grid-cols-[280px_minmax(0,720px)]">
        <aside className="lg:flex">
          <section className="flex w-full flex-col rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-foreground">封面</h2>
              </div>
            </div>

            <FileUpload
              bizType="cover"
              bizId={coverBizId}
              value={coverFile}
              title={isEditing ? "更换企划封面" : "上传企划封面"}
              description={isEditing ? "不上传则保留原封面" : "推荐 2:3 竖版图片，最大 10MB"}
              imagePreview
              accept={["jpg", "jpeg", "png", "gif"]}
              maxSize={10 * 1024 * 1024}
              fillHeight
              onChange={setCoverFile}
            />
          </section>
        </aside>

        <main className="rounded-xl border bg-card p-5 shadow-sm">
          <section className="border-b pb-4">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-medium text-foreground">基础信息</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">企划名</label>
                <Input
                  placeholder="例如：春季漫画汉化企划"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className={fieldClassName}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">别名</label>
                <Input
                  placeholder="选填，默认同企划名"
                  value={formData.alias}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, alias: e.target.value })
                  }
                  className={fieldClassName}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">企划类型</label>
                <Select
                  value={formData.typeId}
                  onValueChange={(value: string | null) =>
                    setFormData({ ...formData, typeId: value || "" })
                  }
                >
                  <SelectTrigger
                    className={cn(
                      fieldClassName,
                      "h-10 w-full justify-between px-3 text-sm font-medium",
                    )}
                    disabled={loadingProjectTypes}
                  >
                    <span
                      className={cn("truncate", !selectedProjectType && "text-muted-foreground")}
                    >
                      {loadingProjectTypes
                        ? "正在加载类型"
                        : selectedProjectType?.name || "选择类型"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isEditing && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">状态</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: string | null) =>
                      setFormData({ ...formData, status: (value ?? "") as ProjectStatus | "" })
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        fieldClassName,
                        "h-10 w-full justify-between px-3 text-sm font-medium",
                      )}
                    >
                      <span className={cn("truncate", !formData.status && "text-muted-foreground")}>
                        {formData.status || "选择状态"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {formData.status === "已归档" && (
                        <SelectItem value="已归档" disabled>
                          已归档
                        </SelectItem>
                      )}
                      <SelectItem value="进行中">进行中</SelectItem>
                      <SelectItem value="已完成">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          <ProjectMetadataEditor
            tags={tags}
            draft={tagDraft}
            onTagsChange={setTags}
            onDraftChange={setTagDraft}
            disabled={loading}
          />

          <section className="pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">简介</label>
              <Textarea
                placeholder="介绍作品来源、当前进度、协作注意事项等"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="min-h-[118px] resize-none rounded-xl border-border/70 bg-muted/20 px-4 py-3 shadow-none focus-visible:border-foreground/30 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-foreground/10"
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
