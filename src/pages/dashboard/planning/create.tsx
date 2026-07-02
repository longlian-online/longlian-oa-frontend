import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, ImagePlus, Info, Loader2, Plus, Tags, X } from "lucide-react";

import { createProject, getProjectTypes } from "@/api/planning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectTypeInfoVO } from "@/types/planning";

interface TagItem {
  key: string;
  value: string;
}

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projectTypes, setProjectTypes] = useState<ProjectTypeInfoVO[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    alias: "",
    typeId: "",
    description: "",
  });
  const [tags, setTags] = useState<TagItem[]>([{ key: "原作者", value: "ぶらぽ" }]);
  const [newTagKey, setNewTagKey] = useState("");
  const [newTagValue, setNewTagValue] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  useEffect(() => {
    void loadProjectTypes();
  }, []);

  const selectedProjectType = projectTypes.find((type) => String(type.id) === formData.typeId);
  const canSubmit = Boolean(formData.title && formData.typeId);

  async function loadProjectTypes(): Promise<void> {
    try {
      const data = await getProjectTypes();
      setProjectTypes(data);
    } catch (error) {
      console.error("Failed to load project types:", error);
    }
  }

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
    if (!canSubmit) return;

    try {
      setLoading(true);
      await createProject({
        title: formData.title,
        alias: formData.alias || formData.title,
        typeId: Number(formData.typeId),
        description: formData.description,
        coverFileId: 1,
        metadata: JSON.stringify({ tags }),
      });
      void navigate("/dashboard/planning");
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("创建失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="mt-0.5"
            aria-label="返回企划列表"
            onClick={() => navigate("/dashboard/planning")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">发布新企划</h1>
              <span className="rounded-full border bg-primary/5 px-2 py-0.5 text-xs text-primary">
                草稿
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">填写基础信息、封面与元信息。</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            暂存
          </Button>
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

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside>
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-foreground">视觉资产</h2>
                <p className="text-xs text-muted-foreground">封面会显示在企划列表中</p>
              </div>
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            </div>

            <button
              type="button"
              className="group flex h-[390px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-input bg-muted/30 p-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border transition-transform group-hover:scale-105">
                <ImagePlus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">上传企划封面</p>
                <p className="text-xs text-muted-foreground">推荐 2:3 竖版图片</p>
              </div>
            </button>

            <div className="mt-3 flex items-center gap-3 rounded-lg border bg-background/60 p-2.5">
              <button
                type="button"
                className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-input transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">缩略图</p>
                <p className="text-xs text-muted-foreground">用于小尺寸场景，可后续裁剪</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-muted/40 p-3">
              <p className="line-clamp-2 text-base font-medium text-foreground">
                {formData.title || "未命名企划"}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-background px-2 py-1">
                  {selectedProjectType?.name || "未选择类型"}
                </span>
                <span>{formData.alias || "暂无别名"}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {formData.description || "简介会在企划详情与列表中辅助成员判断内容方向。"}
              </p>
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
                <label className="text-sm font-medium text-foreground">企划名</label>
                <Input
                  placeholder="例如：春季漫画汉化企划"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="h-10 bg-background"
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
                  className="h-10 bg-background"
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
                  <SelectTrigger className="h-10 w-full bg-background">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
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
                      className="h-8 w-28 bg-background text-xs"
                    />
                    <Input
                      placeholder="值"
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      className="h-8 w-36 bg-background text-xs"
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
                className="min-h-[118px] resize-none bg-background"
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
