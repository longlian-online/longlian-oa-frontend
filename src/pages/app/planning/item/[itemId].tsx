import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskFlowViewer } from "@/components/task-flow/TaskFlowViewer";
import type { ItemTaskFlowVO, TaskInstanceVO } from "@/types/planning";
import { getTaskFlow, getTaskInstances, claimTask } from "@/api/planning";

export default function ItemDetail() {
  const { projectId, itemId } = useParams<{
    projectId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const [taskFlow, setTaskFlow] = useState<ItemTaskFlowVO | null>(null);
  const [taskInstances, setTaskInstances] = useState<TaskInstanceVO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (itemId) {
      void loadTaskFlow();
      void loadTaskInstances();
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

  async function handleClaimNode(nodeId: number) {
    // 找到对应的任务实例
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

  if (loading) {
    return <div className="text-muted-foreground py-8 text-center">加载中...</div>;
  }

  if (!taskFlow) {
    return <div className="text-muted-foreground py-8 text-center">任务流加载失败</div>;
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button variant="ghost" onClick={() => navigate(`/app/planning/${projectId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回企划
      </Button>

      {/* 项目信息 */}
      <div>
        <h1 className="text-foreground text-2xl font-semibold">{taskFlow.name}</h1>
        {taskFlow.description && (
          <p className="text-muted-foreground mt-1">{taskFlow.description}</p>
        )}
      </div>

      {/* 标签页 */}
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
              <TaskFlowViewer nodes={taskFlow.nodes} onClaim={handleClaimNode} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">任务列表视图（TODO：实现列表展示）</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">提交记录（TODO：实现提交历史）</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
