import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectInfoVO } from "@/types/planning";
import { getProjectList } from "@/api/planning";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  IN_PROGRESS: { label: "进行中", variant: "default" },
  COMPLETED: { label: "已完成", variant: "secondary" },
  ARCHIVED: { label: "已归档", variant: "outline" },
};

export default function Planning() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectInfoVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    void loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const result = await getProjectList({
        pageNum: 1,
        pageSize: 20,
        keyword: keyword || undefined,
      });
      setProjects(result.list);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    void loadProjects();
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">企划</h1>
          <p className="text-muted-foreground mt-1">管理和跟踪您的汉化项目</p>
        </div>
        <Button onClick={() => navigate("/dashboard/planning/create")}>
          <Plus className="mr-2 h-4 w-4" />
          创建企划
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="搜索企划..."
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === "Enter" && handleSearch()
              }
              className="max-w-sm"
            />
            <Button variant="secondary" onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 企划列表 */}
      <Card>
        <CardHeader>
          <CardTitle>企划列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">加载中...</div>
          ) : projects.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">暂无企划，点击右上角创建</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>封面</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建人</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/dashboard/planning/${project.id}`)}
                  >
                    <TableCell>
                      <Avatar className="h-12 w-12 rounded-md">
                        <AvatarImage
                          src={project.coverUrl}
                          alt={project.title}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-md text-xs">
                          {project.title.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{project.title}</TableCell>
                    <TableCell>{project.projectType}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[project.projectStatus]?.variant || "default"}>
                        {statusMap[project.projectStatus]?.label || project.projectStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={project.creatorAvatarUrl} />
                          <AvatarFallback className="text-xs">?</AvatarFallback>
                        </Avatar>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
