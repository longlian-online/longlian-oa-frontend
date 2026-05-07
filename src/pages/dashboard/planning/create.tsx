import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ImagePlus, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectTypeInfoVO } from "@/types/planning";
import { getProjectTypes, createProject } from "@/api/planning";

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

  async function loadProjectTypes() {
    try {
      const data = await getProjectTypes();
      setProjectTypes(data);
    } catch (error) {
      console.error("Failed to load project types:", error);
    }
  }

  function handleAddTag() {
    if (newTagKey.trim() && newTagValue.trim()) {
      setTags([...tags, { key: newTagKey.trim(), value: newTagValue.trim() }]);
      setNewTagKey("");
      setNewTagValue("");
      setShowTagInput(false);
    }
  }

  function handleRemoveTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!formData.title || !formData.typeId) return;

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
    <div className="h-full flex flex-col">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/dashboard/planning")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-medium">发布新企划</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            暂存
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !formData.title}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "创建"}
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto flex gap-6">
          {/* 左侧封面区域 */}
          <div className="w-80 shrink-0 space-y-4">
            {/* 主封面上传 */}
            <div className="border-2 border-dashed border-input rounded-lg p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-colors aspect-[2/3]">
              <ImagePlus className="h-8 w-8 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground">封面(2:3)</span>
            </div>

            {/* 缩略图 */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 border-2 border-dashed border-input rounded-md flex items-center justify-center cursor-pointer hover:border-primary/50">
                <Plus className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <div className="text-xs">
                <p className="text-foreground">缩略图(1:1)</p>
                <p className="text-muted-foreground">从封面中裁剪</p>
              </div>
            </div>
          </div>

          {/* 右侧表单区域 */}
          <div className="flex-1 bg-card border rounded-lg p-6 space-y-6">
            {/* 企划名 */}
            <div className="space-y-2">
              <label className="text-sm text-foreground">企划名</label>
              <Input
                placeholder="请输入企划名"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="h-10 bg-secondary/50 border-0 focus:bg-background focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* 别名 */}
            <div className="space-y-2">
              <label className="text-sm text-foreground">别名</label>
              <Input
                placeholder="请输入别名"
                value={formData.alias}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, alias: e.target.value })
                }
                className="h-10 bg-secondary/50 border-0 focus:bg-background focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* 企划类型 */}
            <div className="space-y-2">
              <label className="text-sm text-foreground">企划类型</label>
              <Select
                value={formData.typeId}
                onValueChange={(value: string | null) =>
                  setFormData({ ...formData, typeId: value || "" })
                }
              >
                <SelectTrigger className="h-10 w-40 bg-secondary/50 border-0 focus:bg-background focus:ring-1 focus:ring-ring">
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

            {/* 信息标签 */}
            <div className="space-y-3">
              <label className="text-sm text-foreground">信息</label>
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary/70 rounded-md text-xs"
                  >
                    <span className="text-muted-foreground">{tag.key}</span>
                    <span className="text-foreground">{tag.value}</span>
                    <button
                      onClick={() => handleRemoveTag(index)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {showTagInput ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="标签名"
                      value={newTagKey}
                      onChange={(e) => setNewTagKey(e.target.value)}
                      className="h-7 w-24 text-xs bg-secondary/50 border-0"
                    />
                    <Input
                      placeholder="值"
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      className="h-7 w-24 text-xs bg-secondary/50 border-0"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddTag}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md border border-dashed border-input"
                    onClick={() => setShowTagInput(true)}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>

            {/* 简介 */}
            <div className="space-y-2">
              <label className="text-sm text-foreground">简介</label>
              <Textarea
                placeholder="请输入企划简介"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="min-h-[120px] bg-secondary/50 border-0 resize-none focus:bg-background focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
