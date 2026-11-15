import { useEffect, useState, type ReactElement } from "react";

import PaginationBar from "@/components/PaginationBar";
import RemoteImage from "@/components/RemoteImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { formatDate } from "@/lib/format";
import { PROJECT_MEMBERS_PAGE_SIZE, projectMembersQuery } from "@/queries/planning";

interface ProjectMembersProps {
  projectId: string;
}

function MemberList({ projectId }: ProjectMembersProps): ReactElement {
  const [pageNum, setPageNum] = useState(1);
  const membersQuery = useApiQuery(projectMembersQuery(projectId, pageNum));
  const data = membersQuery.data;

  // 成员退出导致末页消失时回到有效页，不能将仍有成员的企划显示成空列表。
  useEffect((): void => {
    if (!data) return;
    const lastPage = Math.max(1, Math.ceil(data.total / PROJECT_MEMBERS_PAGE_SIZE));
    if (pageNum > lastPage) setPageNum(lastPage);
  }, [data, pageNum]);

  return (
    <section
      id="project-members"
      aria-labelledby="project-members-title"
      className="scroll-mt-6 border-t pt-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="size-2 rounded-full bg-[#e91e63]" />
          <h2
            id="project-members-title"
            tabIndex={-1}
            className="rounded-sm text-base font-medium outline-none data-[locate-highlight]:ring-2 data-[locate-highlight]:ring-ring data-[locate-highlight]:ring-offset-4"
          >
            企划成员
          </h2>
        </div>
        {data && (
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
            {data.total} 人
          </Badge>
        )}
      </div>
      {membersQuery.isError && (
        <div role="alert" className="mt-4 flex items-center gap-3 text-sm">
          <span>{membersQuery.error.message}</span>
          <Button variant="outline" size="sm" onClick={() => void membersQuery.refetch()}>
            重试
          </Button>
        </div>
      )}
      {membersQuery.isLoading ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          加载中...
        </p>
      ) : data && data.total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">暂无企划成员</p>
      ) : data ? (
        <>
          <div className="mt-4 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <ul className="divide-y divide-border/70" aria-label="当前企划成员">
              {data.list.map((member) => (
                <li
                  key={member.userId}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_5rem_minmax(10.5rem,12rem)] items-center gap-4 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {member.avatarUrl ? (
                      <RemoteImage
                        src={member.avatarUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-full ring-1 ring-border/70"
                        fallback={member.nickname.slice(0, 1)}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-1 ring-border/70"
                      >
                        {member.nickname.slice(0, 1)}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words text-sm font-medium">
                        {member.nickname}
                      </span>
                      {member.isCreator && (
                        <Badge variant="outline" className="shrink-0">
                          负责人
                        </Badge>
                      )}
                    </div>
                  </div>
                  <dl className="px-2 py-2 text-center">
                    <dt className="text-xs text-muted-foreground">完成</dt>
                    <dd
                      className={`mt-1 text-lg font-medium leading-none tabular-nums ${
                        member.lastSubmittedAt
                          ? "text-[color:color-mix(in_oklab,var(--primary)_60%,var(--muted-foreground))]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {member.lastSubmittedAt ? member.completedCount : "-"}
                    </dd>
                  </dl>
                  <dl className="min-w-0">
                    <dt className="text-xs text-muted-foreground">最近提交</dt>
                    <dd className="mt-1 truncate text-sm tabular-nums">
                      {member.lastSubmittedAt ? formatDate(member.lastSubmittedAt) : "-"}
                    </dd>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <PaginationBar
              page={pageNum}
              pageSize={PROJECT_MEMBERS_PAGE_SIZE}
              total={data.total}
              disabled={membersQuery.isFetching}
              onPageChange={setPageNum}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

export default function ProjectMembers({ projectId }: ProjectMembersProps): ReactElement {
  const session = useSessionSnapshot();
  return (
    <MemberList key={`${session.userId}:${session.orgId}:${projectId}`} projectId={projectId} />
  );
}
