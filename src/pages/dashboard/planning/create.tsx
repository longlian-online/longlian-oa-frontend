import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Check, Info, Loader2 } from "lucide-react";

import { useApiMutation } from "@/hooks/queries/useApiQuery";
import { useUploadFile } from "@/hooks/useUploadFile";
import { createProject, updateProject } from "@/api/planning";
import FileUpload from "@/components/FileUpload";
import RemoteImage from "@/components/RemoteImage";
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
import { centerCropSquare, PROJECT_IMAGE_MAX_BYTES } from "@/lib/imageCrop";
import { requestImageCrop, UploadCancelledError } from "@/lib/imageCropRequest";
import { fileFromPreview } from "@/lib/projectThumbnail";

import type { UploadedFileInfo } from "@/types/file";
import type {
  ProjectCreateDTO,
  ProjectUpdateDTO,
  ProjectDetailInfoVO,
  ProjectStatus,
} from "@/types/planning";
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
  const createMutation = useApiMutation({
    mutationFn: (payload: ProjectCreateDTO) => createProject(payload),
    invalidate: [["projects"], ["workshop"], ["plaza"]],
  });
  const updateMutation = useApiMutation({
    mutationFn: (payload: ProjectUpdateDTO) => updateProject(project!.id, payload),
    invalidate: [["projects"], ["workshop"], ["plaza"]],
  });
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const loading = createMutation.isPending || updateMutation.isPending || saveSucceeded;
  const [showInvalid, setShowInvalid] = useState(false);
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
  const [thumbnailFile, setThumbnailFile] = useState<UploadedFileInfo | null>(
    project?.thumbnailUrl
      ? {
          fileId: "",
          fileName: project.title,
          fileSize: 0,
          fileMime: "image/*",
          previewUrl: project.thumbnailUrl,
        }
      : null,
  );
  const thumbnailOrigin = useRef<"cover" | "custom">(project?.thumbnailUrl ? "custom" : "cover");
  const [thumbnailFollowsCover, setThumbnailFollowsCover] = useState(
    thumbnailOrigin.current === "cover",
  );
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailToken = useRef(0);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const { uploadFile } = useUploadFile();

  function rememberThumbnailOrigin(origin: "cover" | "custom"): void {
    thumbnailOrigin.current = origin;
    setThumbnailFollowsCover(origin === "cover");
  }

  async function uploadPreparedThumbnail(
    file: File,
    origin: "cover" | "custom",
    token: number,
  ): Promise<void> {
    const uploaded = await uploadFile(file, {
      bizType: "thumbnail",
      bizId: coverBizId,
      accept: ["jpg", "jpeg", "png", "gif", "webp", "avif"],
      maxSize: PROJECT_IMAGE_MAX_BYTES,
      skipCrop: true,
    });
    if (token !== thumbnailToken.current) return;
    rememberThumbnailOrigin(origin);
    setThumbnailFile(uploaded);
  }

  async function generateThumbnailFromCover(previewUrl: string, fileName: string): Promise<void> {
    const token = ++thumbnailToken.current;
    setThumbnailBusy(true);
    try {
      const source = await fileFromPreview(previewUrl, fileName);
      const cropped = await centerCropSquare(source);
      if (token !== thumbnailToken.current) return;
      await uploadPreparedThumbnail(cropped, "cover", token);
    } catch (error) {
      if (token !== thumbnailToken.current || error instanceof UploadCancelledError) return;
      setThumbnailFile(null);
    } finally {
      if (token === thumbnailToken.current) setThumbnailBusy(false);
    }
  }

  async function handleCoverChange(next: UploadedFileInfo | null): Promise<void> {
    setCoverFile(next);
    if (thumbnailOrigin.current !== "cover") return;
    if (!next?.previewUrl) {
      thumbnailToken.current += 1;
      setThumbnailFile(null);
      setThumbnailBusy(false);
      return;
    }
    await generateThumbnailFromCover(next.previewUrl, next.fileName);
  }

  async function cropThumbnailFromCover(): Promise<void> {
    if (!coverFile?.previewUrl || thumbnailBusy) return;
    const token = ++thumbnailToken.current;
    setThumbnailBusy(true);
    try {
      const source = await fileFromPreview(coverFile.previewUrl, coverFile.fileName);
      const cropped = await requestImageCrop(source, 1, { shape: "rect", allowOriginal: false });
      if (token !== thumbnailToken.current) return;
      await uploadPreparedThumbnail(cropped, "cover", token);
    } catch (error) {
      if (error instanceof UploadCancelledError) return;
    } finally {
      if (token === thumbnailToken.current) setThumbnailBusy(false);
    }
  }

  async function uploadCustomThumbnail(file: File): Promise<void> {
    const token = ++thumbnailToken.current;
    setThumbnailBusy(true);
    try {
      const uploaded = await uploadFile(file, {
        bizType: "thumbnail",
        bizId: coverBizId,
        accept: ["jpg", "jpeg", "png", "gif", "webp", "avif"],
        maxSize: PROJECT_IMAGE_MAX_BYTES,
      });
      if (token !== thumbnailToken.current) return;
      rememberThumbnailOrigin("custom");
      setThumbnailFile(uploaded);
    } catch (error) {
      if (error instanceof UploadCancelledError) return;
    } finally {
      if (token === thumbnailToken.current) setThumbnailBusy(false);
    }
  }

  const selectedProjectType = projectTypes.find((type) => type.id === formData.typeId);

  const titleMissing = !formData.title.trim();
  const typeMissing = !formData.typeId;
  const coverMissing = !isEditing && !coverFile?.fileId;

  const initializedProjectType = useRef(false);
  useEffect(() => {
    if (initializedProjectType.current || !project || formData.typeId || projectTypes.length === 0)
      return;
    const matchedType = projectTypes.find((type) => type.name === project.typeName);
    if (matchedType) {
      initializedProjectType.current = true;
      setFormData((current) => ({ ...current, typeId: matchedType.id }));
    }
  }, [formData.typeId, project, projectTypes]);

  const submitLock = useRef(false);
  async function handleSubmit(): Promise<void> {
    if (submitLock.current || loading || thumbnailBusy) return;
    if (titleMissing || typeMissing || coverMissing) {
      setShowInvalid(true);
      return;
    }

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

    submitLock.current = true;
    let succeeded = false;
    try {
      if (isEditing && project) {
        await updateMutation.mutateAsync({
          title: formData.title.trim(),
          alias: formData.alias.trim() || formData.title.trim(),
          typeId: formData.typeId,
          description: formData.description.trim(),
          metadata: JSON.stringify({ tags: submittedTags }),
          coverFileId: coverFile?.fileId || undefined,
          thumbnailFileId: thumbnailFile?.fileId || undefined,
          status:
            formData.status === "进行中" || formData.status === "已完成"
              ? formData.status
              : undefined,
        });
        succeeded = true;
        setSaveSucceeded(true);
        $tip("企划已更新", "success");
        void navigate(`/dashboard/planning/${project.id}`);
      } else if (coverFile) {
        await createMutation.mutateAsync({
          title: formData.title.trim(),
          alias: formData.alias.trim() || formData.title.trim(),
          typeId: formData.typeId,
          description: formData.description.trim(),
          coverFileId: coverFile.fileId,
          thumbnailFileId: thumbnailFile?.fileId || undefined,
          metadata: JSON.stringify({ tags: submittedTags }),
        });
        succeeded = true;
        setSaveSucceeded(true);
        $tip("企划创建成功", "success");
        void navigate("/dashboard/planning");
      }
    } catch {
      /* 保留表单，由共享 Mutation 提示错误。 */
    } finally {
      if (!succeeded) submitLock.current = false;
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
              {isEditing
                ? "更新基础信息、封面、缩略图与标签。"
                : "填写基础信息、封面、缩略图与标签。"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="min-w-24"
          onClick={handleSubmit}
          disabled={loading || thumbnailBusy}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isEditing ? "保存修改" : "创建企划"}
        </Button>
      </div>

      <div className="grid items-start justify-center gap-4 lg:grid-cols-[280px_minmax(0,720px)]">
        <aside>
          <section className="flex w-full flex-col rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-foreground">
                  封面
                  {!isEditing && <span className="text-destructive"> *</span>}
                </h2>
              </div>
            </div>

            <FileUpload
              bizType="cover"
              bizId={coverBizId}
              value={coverFile}
              title={isEditing ? "更换企划封面" : "上传企划封面"}
              description={`${isEditing ? "不上传则保留原封面；" : "推荐 2:3 竖版图片；"}最大 10MB`}
              imagePreview
              accept={["jpg", "jpeg", "png", "gif", "webp", "avif"]}
              maxSize={PROJECT_IMAGE_MAX_BYTES}
              fillHeight
              invalid={showInvalid && coverMissing}
              onChange={(file) => void handleCoverChange(file)}
            />
            <div className="mt-4 border-t pt-4">
              <h2 className="text-sm font-medium text-foreground">缩略图</h2>
              <p className="mt-1 text-xs text-muted-foreground">1:1 · 最大 10MB</p>
              <div className="mt-3 flex items-start gap-3">
                <div className="size-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {thumbnailFile?.previewUrl ? (
                    <RemoteImage
                      src={thumbnailFile.previewUrl}
                      alt="缩略图预览"
                      className="size-full"
                      fallback={<span className="text-xs">1:1</span>}
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                      1:1
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {thumbnailBusy
                      ? "正在处理缩略图"
                      : thumbnailFollowsCover
                        ? thumbnailFile
                          ? "从封面中心截取"
                          : "上传封面后自动截取，也可自行上传"
                        : "自定义，不随封面更新"}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!coverFile?.previewUrl || thumbnailBusy}
                      onClick={() => void cropThumbnailFromCover()}
                    >
                      从封面裁剪
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={thumbnailBusy}
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      上传缩略图
                    </Button>
                  </div>
                </div>
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void uploadCustomThumbnail(file);
                }}
              />
            </div>
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
                <label className="text-sm font-medium text-foreground">
                  企划名<span className="text-destructive"> *</span>
                </label>
                <Input
                  placeholder="例如：春季漫画汉化企划"
                  value={formData.title}
                  aria-invalid={showInvalid && titleMissing}
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
                <label className="text-sm font-medium text-foreground">
                  企划类型<span className="text-destructive"> *</span>
                </label>
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
                    aria-invalid={showInvalid && typeMissing}
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
