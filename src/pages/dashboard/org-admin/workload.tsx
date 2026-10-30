import { useEffect, useRef, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { Link } from "react-router";

import { updateMemberNote } from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import FilterSelectContent from "@/components/FilterSelectContent";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PaginationBar from "@/components/PaginationBar";
import RemoteImage from "@/components/RemoteImage";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { usePageQuery } from "@/hooks/usePageQuery";
import {
  INITIAL_WORKLOAD_FILTERS,
  ORGANIZATION_ADMIN_PAGE_SIZE as PAGE_SIZE,
  organizationWorkloadsQuery,
} from "@/queries/organizationAdmin";
import type { OrganizationMemberWorkloadVO } from "@/types/organizationAdmin";

import {
  commitWorkloadFilters,
  WORKLOAD_SEARCH_DEBOUNCE_MS,
  type WorkloadFilters,
} from "./workloadFilters";
import { workloadTaskPath, workloadTaskState, workloadTaskTitle } from "./workloadTask";

function memberName(member: OrganizationMemberWorkloadVO): string {
  return member.nickname || member.username || member.userId;
}

function WorkloadNote({
  member,
  saving,
  onSave,
}: {
  member: OrganizationMemberWorkloadVO;
  saving: boolean;
  onSave: (memberId: string, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(member.note ?? "");
  const trimmed = note.trim();
  const unchanged = trimmed === (member.note ?? "").trim();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`workload-note-${member.id}`}>备注</Label>
      <Textarea
        id={`workload-note-${member.id}`}
        value={note}
        maxLength={500}
        rows={2}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={unchanged || saving}
          onClick={() => void onSave(member.id, trimmed)}
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          保存
        </Button>
      </div>
    </div>
  );
}

function OrganizationWorkloadContent() {
  const [filters, setFilters] = useState<WorkloadFilters>(INITIAL_WORKLOAD_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const appliedFiltersRef = useRef(appliedFilters);
  const [page, setPage] = usePageQuery();
  const listQuery = useApiQuery(organizationWorkloadsQuery(appliedFilters, page));
  const saveNote = useApiMutation<void, [string, string]>({
    mutationFn: ([memberId, note]) => updateMemberNote(memberId, { note }),
    invalidate: [["members", "workload"]],
  });
  const members = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;
  const savingId = saveNote.isPending ? String(saveNote.variables?.[0] ?? "") : null;

  useEffect(() => {
    const next = commitWorkloadFilters(appliedFiltersRef.current, filters);
    if (!next) return;
    const timer = window.setTimeout(() => {
      appliedFiltersRef.current = next;
      setAppliedFilters(next);
      setPage(1);
    }, WORKLOAD_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filters, setPage]);

  async function handleSaveNote(memberId: string, note: string): Promise<void> {
    try {
      await saveNote.mutateAsync([memberId, note]);
      $tip("备注已保存", "success");
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <h1 className="text-xl font-bold text-foreground">负载</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56 max-w-full">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.keyword}
              placeholder="搜索成员"
              className="pl-9"
              onChange={(event) =>
                setFilters((current) => ({ ...current, keyword: event.target.value }))
              }
            />
          </div>
          <Select
            value={filters.orderDir}
            onValueChange={(value) => {
              if (value !== "ASC" && value !== "DESC") return;
              setFilters((current) => ({ ...current, orderDir: value }));
            }}
          >
            <SelectTrigger className="w-44" aria-label="排序方式">
              <SelectValue>
                {filters.orderDir === "ASC" ? "待提交从少到多" : "待提交从多到少"}
              </SelectValue>
            </SelectTrigger>
            <FilterSelectContent>
              <SelectItem value="DESC">待提交从多到少</SelectItem>
              <SelectItem value="ASC">待提交从少到多</SelectItem>
            </FilterSelectContent>
          </Select>
        </div>
      </div>

      {listQuery.isError && !listQuery.data ? (
        <Button variant="outline" onClick={() => void listQuery.refetch()}>
          加载失败，重试
        </Button>
      ) : loading ? (
        <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          正在加载成员...
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5 text-muted-foreground" />}
          title="暂无成员"
          description="当前没有符合条件的组织成员。"
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            {members.map((member) => {
              const disabled = member.status === "DISABLED";
              return (
                <section
                  key={member.id}
                  className="flex flex-col gap-3 border-b px-4 py-4 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <RemoteImage
                        src={member.avatarUrl}
                        alt=""
                        className="size-9 rounded-full"
                        fallback={
                          <span className="text-sm font-medium">
                            {memberName(member).slice(0, 1)}
                          </span>
                        }
                      />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                        {memberName(member).slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-medium text-foreground">
                          {memberName(member)}
                        </div>
                        <Badge variant={disabled ? "secondary" : "outline"}>
                          {disabled ? "已禁用" : "已启用"}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        待提交 {member.claimedCount} · 可提交 {member.readyCount} · 等前置{" "}
                        {member.waitingCount}
                      </div>
                    </div>
                  </div>

                  {member.tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">没有待提交的任务</p>
                  ) : (
                    <div className="flex flex-col">
                      {member.tasks.map((task) => {
                        const title = workloadTaskTitle(task);
                        const state = workloadTaskState(task);
                        const waiting = Boolean(task.waitingStageName);
                        return (
                          <Link
                            key={task.instanceId}
                            to={workloadTaskPath(task)}
                            aria-label={`${title}，${state}`}
                            className="flex min-w-0 items-baseline justify-between gap-3 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/70"
                          >
                            <span className="min-w-0 truncate text-foreground">{title}</span>
                            {waiting ? (
                              <span className="inline-block max-w-[40%] shrink-0 truncate rounded-full bg-[#fcede1] px-2.5 py-0.5 text-xs font-medium text-[#c45628] dark:bg-[#3a241c] dark:text-[#f3b08a]">
                                {state}
                              </span>
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {state}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  <WorkloadNote
                    key={`${member.id}:${member.note}`}
                    member={member}
                    saving={savingId === member.id}
                    onSave={handleSaveNote}
                  />
                </section>
              );
            })}
          </div>
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            disabled={loading}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

export default function OrganizationWorkloadPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationWorkloadContent />
    </OrganizationAdminGuard>
  );
}
