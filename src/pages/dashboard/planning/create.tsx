import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, ImagePlus, Info, Loader2, Plus, Tags, X } from "lucide-react";

import { createProject } from "@/api/planning";
import FileUpload from "@/components/FileUpload";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import { cn } from "@/lib/utils";
import { getCurrentOrgId } from "@/lib/session";
import type { UploadedFileInfo } from "@/types/file";

interface TagItem {
  key: string;
  value: string;
}

const fieldClassName =
  "border-border/70 bg-muted/20 shadow-none focus-visible:border-foreground/30 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-foreground/10";

export default function CreateProject() {
  const navigate = useNavigate();
  const { projectTypes, loading: loadingProjectTypes } = useProjectTypes();
  const coverBizId = getCurrentOrgId() ?? "cover";
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    alias: "",
    typeId: "",
    description: "",
  });
  const [tags, setTags] = useState<TagItem[]>([]);
  const [newTagKey, setNewTagKey] = useState("");
  const [newTagValue, setNewTagValue] = useState("");
  const [showTagInput, setShowTagInput] = useState(true);
  const [coverFile, setCoverFile] = useState<UploadedFileInfo | null>(null);
  const selectedProjectType = projectTypes.find((type) => type.id === formData.typeId);

  const canSubmit = Boolean(formData.title && formData.typeId && coverFile?.fileId);

  function handleAddTag(): void {
    if (newTagKey.trim() && newTagValue.trim()) {
      setTags([...tags, { key: newTagKey.trim(), value: newTagValue.trim() }]);
      setNewTagKey("");
      setNewTagValue("");
      setShowTagInput(false);
    }
  }

  function handleRemoveTag(index: number): void {
    setTags(tags.filter((_, i) => i !== index));
  }

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || !coverFile) return;

    const pendingTagKey = newTagKey.trim();
    const pendingTagValue = newTagValue.trim();
    if ((pendingTagKey && !pendingTagValue) || (!pendingTagKey && pendingTagValue)) {
      $tip("请补全元信息的标签名和值", "error");
      return;
    }

    const submittedTags =
      pendingTagKey && pendingTagValue
        ? [...tags, { key: pendingTagKey, value: pendingTagValue }]
        : tags;

    try {
      setLoading(true);
      await createProject({
        title: formData.title,
        alias: formData.alias || formData.title,
        typeId: formData.typeId,
        description: formData.description,
        coverFileId: coverFile.fileId,
        metadata: JSON.stringify({ tags: submittedTags }),
      });
      $tip("企划创建成功", "success");
      void navigate("/dashboard/planning");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "创建失败，请重试", "error");
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
              <h1 className="text-xl font-semibold tracking-tight text-foreground">发布新企划</h1>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">填写基础信息、封面与元信息。</p>
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
            创建企划
          </Button>
        </div>
      </div>

      <div className="grid items-start justify-center gap-4 lg:grid-cols-[280px_minmax(0,720px)]">
        <aside>
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-foreground">视觉资产</h2>
                <p className="text-xs text-muted-foreground">封面会显示在企划列表中</p>
              </div>
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            </div>

            <FileUpload
              bizType="cover"
              bizId={coverBizId}
              value={coverFile}
              title="上传企划封面"
              description="推荐 2:3 竖版图片，最大 10MB"
              imagePreview
              accept={["jpg", "jpeg", "png", "gif"]}
              maxSize={10 * 1024 * 1024}
              className="[&>button]:h-[340px]"
              onChange={setCoverFile}
            />

            <div className="mt-3 flex items-center gap-3 rounded-lg border bg-background/60 p-2.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {coverFile?.previewUrl ? (
                  <img
                    src={coverFile.previewUrl}
                    alt="封面缩略图"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">缩略图</p>
                <p className="text-xs text-muted-foreground">创建后自动使用封面图片</p>
              </div>
            </div>
          </section>
        </aside>

        <main className="h-fit rounded-xl border bg-card p-5 shadow-sm">
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
            </div>
          </section>

          <section className="border-b py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-medium text-foreground">元信息</h2>
              </div>
              {!showTagInput && (
                <Button variant="outline" size="sm" onClick={() => setShowTagInput(true)}>
                  <Plus className="h-4 w-4" />
                  添加信息
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag, index) => (
                  <div
                    key={`${tag.key}-${tag.value}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border bg-muted/40 py-1 pl-3 pr-1 text-xs"
                  >
                    <span className="text-muted-foreground">{tag.key}</span>
                    <span className="text-foreground">{tag.value}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {showTagInput ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
                    <Input
                      placeholder="标签名"
                      value={newTagKey}
                      onChange={(e) => setNewTagKey(e.target.value)}
                      className="h-8 w-28 border-border/70 bg-background text-xs focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/10"
                    />
                    <Input
                      placeholder="值"
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      className="h-8 w-36 border-border/70 bg-background text-xs focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/10"
                    />
                    <Button size="sm" variant="secondary" className="h-8" onClick={handleAddTag}>
                      添加
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setShowTagInput(false);
                        setNewTagKey("");
                        setNewTagValue("");
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

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
