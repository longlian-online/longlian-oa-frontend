import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskFlowViewer } from "@/components/task-flow/TaskFlowViewer";
import { TaskSubmitDialog } from "@/components/task-flow/TaskSubmitDialog";
import { TaskRejectDialog } from "@/components/task-flow/TaskRejectDialog";
import type { ItemTaskFlowVO, TaskInstanceVO, TaskSubmissionVO } from "@/types/planning";
import {
  getTaskFlow,
  getTaskInstances,
  claimTask,
  submitTask,
  rejectTask,
  getTaskSubmissions,
} from "@/api/planning";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ItemDetail() {
  const { projectId, itemId } = useParams<{
    projectId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const [taskFlow, setTaskFlow] = useState<ItemTaskFlowVO | null>(null);
  const [taskInstances, setTaskInstances] = useState<TaskInstanceVO[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmissionVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  useEffect(() => {
    if (itemId) {
      void loadTaskFlow();
      void loadTaskInstances();
      void loadSubmissions();
    }
  }, [itemId]);

  async function loadTaskFlow() {
    try {
      setLoading(true);
      const data = await getTaskFlow(Number(itemId));
      setTaskFlow(data);
    } catch (error) {
      console.error("Failed to load task flow:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTaskInstances() {
    try {
      const data = await getTaskInstances(projectId!);
      setTaskInstances(data);
    } catch (error) {
      console.error("Failed to load task instances:", error);
    }
  }

  async function loadSubmissions() {
    try {
      const allSubmissions: TaskSubmissionVO[] = [];
      for (const instance of taskInstances) {
        const result = await getTaskSubmissions(instance.id);
        allSubmissions.push(...result.list);
      }
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error("Failed to load submissions:", error);
    }
  }

  async function handleClaimNode(nodeId: number) {
    const instance = taskInstances.find((i) => i.itemTaskNodeId === nodeId);
    if (instance) {
      try {
        await claimTask(instance.id);
        await loadTaskFlow();
        await loadTaskInstances();
      } catch (error) {
        console.error("Failed to claim task:", error);
      }
    }
  }

  function handleSubmitNode(nodeId: number) {
    setSelectedNodeId(nodeId);
    setSubmitDialogOpen(true);
  }

  async function handleSubmit(metadata: Record<string, unknown>) {
    if (!selectedNodeId) return;
    const instance = taskInstances.find((i) => i.itemTaskNodeId === selectedNodeId);
    if (instance) {
      try {
        await submitTask(instance.id, { metadata: JSON.stringify(metadata) });
        await loadTaskFlow();
        await loadTaskInstances();
        await loadSubmissions();
      } catch (error) {
        console.error("Failed to submit task:", error);
      }
    }
  }

  function handleRejectNode(nodeId: number) {
    setSelectedNodeId(nodeId);
    setRejectDialogOpen(true);
  }

  async function handleReject(reason: string) {
    if (!selectedNodeId) return;
    const instance = taskInstances.find((i) => i.itemTaskNodeId === selectedNodeId);
    if (instance) {
      try {
        await rejectTask(instance.id, { reviewComment: reason });
        await loadTaskFlow();
        await loadTaskInstances();
        await loadSubmissions();
      } catch (error) {
        console.error("Failed to reject task:", error);
      }
    }
  }

  function getSelectedNode() {
    if (!taskFlow || !selectedNodeId) return null;
    return taskFlow.nodes.find((n) => n.id === selectedNodeId) || null;
  }

  // 计算被拒绝的节点
  const rejectedNodes = submissions
    .filter((s) => s.status === "REJECTED")
    .map((s) => ({
      nodeId: s.itemTaskNodeId,
      reason: s.reviewComment || "",
    }));

  if (loading) {
    return <div className="text-muted-foreground py-8 text-center">加载中...</div>;
  }

  if (!taskFlow) {
    return <div className="text-muted-foreground py-8 text-center">任务流加载失败</div>;
  }

  const selectedNode = getSelectedNode();

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(`/dashboard/planning/${projectId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回企划
      </Button>

      <div>
        <h1 className="text-foreground text-2xl font-semibold">{taskFlow.name}</h1>
        {taskFlow.description && (
          <p className="text-muted-foreground mt-1">{taskFlow.description}</p>
        )}
      </div>

      <Tabs defaultValue="flow">
        <TabsList>
          <TabsTrigger value="flow">任务流程</TabsTrigger>
          <TabsTrigger value="tasks">任务列表</TabsTrigger>
          <TabsTrigger value="submissions">提交记录</TabsTrigger>
        </TabsList>

        <TabsContent value="flow">
          <Card>
            <CardHeader>
              <CardTitle>任务流程图</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskFlowViewer
                nodes={taskFlow.nodes}
                rejectedNodes={rejectedNodes}
                onClaim={handleClaimNode}
                onSubmit={handleSubmitNode}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>任务列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {taskInstances.map((instance) => (
                  <div
                    key={instance.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={instance.assigneeAvatarUrl} />
                        <AvatarFallback>
                          {instance.assigneeNickname?.slice(0, 1) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{instance.baseTaskName}</div>
                        <div className="text-muted-foreground text-sm">
                          {instance.assigneeNickname || "待接取"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          instance.status === "COMPLETED"
                            ? "secondary"
                            : instance.status === "CLAIMED"
                              ? "default"
                              : "outline"
                        }
                      >
                        {instance.status === "PENDING"
                          ? "待接取"
                          : instance.status === "CLAIMED"
                            ? "进行中"
                            : "已完成"}
                      </Badge>
                      {instance.status === "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectNode(instance.itemTaskNodeId)}
                        >
                          打回
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>提交记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] space-y-4 overflow-y-auto pr-2">
                {submissions.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">暂无提交记录</div>
                ) : (
                  submissions.map((submission) => (
                    <div key={submission.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={submission.submitterAvatarUrl} />
                            <AvatarFallback className="text-xs">
                              {submission.submitterNickname?.slice(0, 1) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{submission.baseTaskName}</div>
                            <div className="text-muted-foreground text-xs">
                              {submission.submitterNickname} · {submission.createdAt}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            submission.status === "REJECTED"
                              ? "destructive"
                              : submission.status === "RESET"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {submission.status === "SUBMITTED"
                            ? "已提交"
                            : submission.status === "REJECTED"
                              ? "被打回"
                              : "已撤回"}
                        </Badge>
                      </div>
                      {submission.reviewComment && (
                        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm dark:bg-red-950">
                          <div className="text-red-600 dark:text-red-400 font-medium">
                            打回理由:
                          </div>
                          <div className="text-red-600 dark:text-red-400">
                            {submission.reviewComment}
                          </div>
                        </div>
                      )}
                      <Separator className="my-3" />
                      <div className="text-muted-foreground text-xs">
                        元数据: {submission.metadata || "{}"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedNode && (
        <>
          <TaskSubmitDialog
            open={submitDialogOpen}
            onOpenChange={setSubmitDialogOpen}
            taskName={selectedNode.name}
            metaSchema={selectedNode.metaSchema}
            onSubmit={handleSubmit}
          />
          <TaskRejectDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            taskName={selectedNode.name}
            onReject={handleReject}
          />
        </>
      )}
    </div>
  );
}
