import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, ChevronDown, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectInfoVO } from "@/types/planning";
import { getProjectList } from "@/api/planning";

const typeOptions = [
  { value: "all", label: "所有类型" },
  { value: "漫画", label: "漫画" },
  { value: "小说", label: "小说" },
  { value: "视频", label: "视频" },
  { value: "美术", label: "美术" },
];

export default function Planning() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectInfoVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedType, setSelectedType] = useState("all");

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
        projectType: selectedType === "all" ? undefined : selectedType,
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
      {/* 顶部搜索和筛选 */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索企划..."
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              e.key === "Enter" && handleSearch()
            }
            className="pl-10 h-9 bg-background border-input rounded-md"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* 时间排序 */}
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            时间
            <ChevronDown className="h-3 w-3" />
          </Button>

          {/* 类型筛选 */}
          <Select
            value={selectedType}
            onValueChange={(value: string | null) => {
              if (value) {
                setSelectedType(value);
                setTimeout(() => void loadProjects(), 0);
              }
            }}
          >
            <SelectTrigger className="h-9 w-28 border-0 bg-transparent text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0 text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 企划网格 */}
      {loading ? (
        <div className="text-muted-foreground py-8 text-center">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* 创建新企划卡片 */}
          <div
            onClick={() => navigate("/dashboard/planning/create")}
            className="group border-2 border-dashed border-input rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/[0.02] transition-colors min-h-[180px]"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/5 transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                创建新企划
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">点击开始一个新的创作企划</p>
            </div>
          </div>

          {/* 企划卡片 */}
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/dashboard/planning/${project.id}`)}
              className="group bg-card border rounded-lg overflow-hidden cursor-pointer hover:shadow-sm transition-shadow"
            >
              <div className="flex h-full">
                {/* 左侧封面 */}
                <div className="w-32 h-44 shrink-0 overflow-hidden">
                  <Avatar className="h-full w-full rounded-none">
                    <AvatarImage
                      src={project.coverUrl}
                      alt={project.title}
                      className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-200"
                    />
                    <AvatarFallback className="rounded-none text-lg bg-muted">
                      {project.title.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* 右侧内容 */}
                <div className="flex-1 p-3 flex flex-col">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1.5">{project.title}</h3>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {project.projectType}
                    </Badge>
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-auto">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={project.creatorAvatarUrl} />
                      <AvatarFallback className="text-[10px]">
                        {project.title.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Button size="sm" variant="default" className="h-7 px-3 text-xs rounded-md">
                      探索企划
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
