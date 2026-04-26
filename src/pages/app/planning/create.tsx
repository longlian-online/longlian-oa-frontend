import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectTypeInfoVO } from "@/types/planning";
import { getProjectTypes, createProject } from "@/api/planning";

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projectTypes, setProjectTypes] = useState<ProjectTypeInfoVO[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    alias: "",
    typeId: "",
    description: "",
    coverFileId: 1, // TODO: 文件上传功能
  });

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title || !formData.typeId) return;

    try {
      setLoading(true);
      await createProject({
        title: formData.title,
        alias: formData.alias || formData.title,
        typeId: Number(formData.typeId),
        description: formData.description,
        coverFileId: formData.coverFileId,
        metadata: "{}",
      });
      void navigate("/app/planning");
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("创建失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 返回按钮 */}
      <Button variant="ghost" onClick={() => navigate("/app/planning")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回列表
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>创建企划</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">
                企划名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="请输入企划名称"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            {/* 别名 */}
            <div className="space-y-2">
              <Label htmlFor="alias">别名</Label>
              <Input
                id="alias"
                placeholder="请输入别名（可选）"
                value={formData.alias}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, alias: e.target.value })
                }
              />
            </div>

            {/* 类型 */}
            <div className="space-y-2">
              <Label htmlFor="type">
                企划类型 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.typeId}
                onValueChange={(value) => setFormData({ ...formData, typeId: value ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择企划类型" />
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

            {/* 简介 */}
            <div className="space-y-2">
              <Label htmlFor="description">企划简介</Label>
              <Textarea
                id="description"
                placeholder="请输入企划简介（可选）"
                rows={4}
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* 封面 - TODO */}
            <div className="space-y-2">
              <Label>封面图片</Label>
              <div className="border-input bg-background flex h-32 items-center justify-center rounded-md border border-dashed">
                <span className="text-muted-foreground text-sm">文件上传功能待实现（TODO）</span>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/app/planning")}
              >
                取消
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建企划"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
