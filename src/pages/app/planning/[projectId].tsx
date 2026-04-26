import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ProjectDetailInfoVO,
  ProjectItemListVO,
  TaskTemplateOptionVO,
} from "@/types/planning";
import {
  getProjectDetail,
  getProjectItemList,
  getTaskTemplateOptions,
  createProjectItem,
} from "@/api/planning";

const statusMap: Record<string, { label: string; color: string }> = {
  进行中: { label: "进行中", color: "bg-blue-500" },
  已完成: { label: "已完成", color: "bg-green-500" },
  已归档: { label: "已归档", color: "bg-gray-500" },
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetailInfoVO | null>(null);
  const [items, setItems] = useState<ProjectItemListVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplateOptionVO[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    if (projectId) {
      void loadProjectDetail();
      void loadProjectItems();
    }
  }, [projectId]);

  async function loadProjectDetail() {
    try {
      const data = await getProjectDetail(projectId!);
      setProject(data);
    } catch (error) {
      console.error("Failed to load project:", error);
    }
  }

  async function loadProjectItems() {
    try {
      setLoading(true);
      const result = await getProjectItemList(projectId!);
      setItems(result.list);
    } catch (error) {
      console.error("Failed to load items:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const data = await getTaskTemplateOptions();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  function openCreateDialog() {
    void loadTemplates();
    setDialogOpen(true);
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemTitle || !selectedTemplate) return;

    try {
      setCreateLoading(true);
      await createProjectItem(projectId!, {
        title: newItemTitle,
        taskTemplateId: Number(selectedTemplate),
      });
      setDialogOpen(false);
      setNewItemTitle("");
      setSelectedTemplate("");
      await loadProjectItems();
    } catch (error) {
      console.error("Failed to create item:", error);
      alert("创建失败，请重试");
    } finally {
      setCreateLoading(false);
    }
  }

  if (!project) {
    return <div className="text-muted-foreground py-8 text-center">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button variant="ghost" onClick={() => navigate("/app/planning")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回列表
      </Button>

      {/* 企划基本信息 */}
      <div className="flex gap-6">
        <Avatar className="h-32 w-32 rounded-lg">
          <AvatarImage src={project.coverUrl} alt={project.title} className="object-cover" />
          <AvatarFallback className="rounded-lg text-2xl">
            {project.title.slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-foreground text-2xl font-semibold">{project.title}</h1>
              <p className="text-muted-foreground">{project.alias}</p>
            </div>
            <div className="flex gap-2">
              {project.isCreator && <Button variant="outline">编辑企划</Button>}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger>
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    创建项目
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>创建项目</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateItem} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemTitle">
                        项目名称 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="itemTitle"
                        placeholder="请输入项目名称"
                        value={newItemTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewItemTitle(e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        任务模板 <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={selectedTemplate}
                        onValueChange={(value) => setSelectedTemplate(value ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择任务模板" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setDialogOpen(false)}
                      >
                        取消
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createLoading || !newItemTitle || !selectedTemplate}
                      >
                        {createLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            创建中...
                          </>
                        ) : (
                          "创建"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge className={statusMap[project.status]?.color || "bg-blue-500"}>
              {statusMap[project.status]?.label || project.status}
            </Badge>
            <span className="text-muted-foreground text-sm">类型: {project.typeName}</span>
          </div>

          <p className="text-muted-foreground">{project.description}</p>

          {/* 进度统计 */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{project.progressPercent}%</div>
                <div className="text-muted-foreground text-sm">总进度</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{project.pendingTaskCount}</div>
                <div className="text-muted-foreground text-sm">待接取任务</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{project.claimedTaskCount}</div>
                <div className="text-muted-foreground text-sm">进行中任务</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 项目列表 */}
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">项目列表</TabsTrigger>
          <TabsTrigger value="tasks">可接取任务</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">加载中...</div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">暂无项目</p>
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建第一个项目
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/app/planning/${projectId}/item/${item.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <Badge
                        variant={
                          item.status === "COMPLETED"
                            ? "secondary"
                            : item.status === "PUBLISHED"
                              ? "outline"
                              : "default"
                        }
                      >
                        {item.status === "IN_PROGRESS"
                          ? "进行中"
                          : item.status === "COMPLETED"
                            ? "已完成"
                            : "已公布"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-muted-foreground mb-2 text-sm">
                          当前节点: {item.currentNodeName || "未开始"}
                        </div>
                        <div className="bg-secondary h-2 overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full transition-all"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-medium">{item.progressPercent}%</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">可接取任务列表（TODO：实现任务接取功能）</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
