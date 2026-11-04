import { useEffect, useState, type ReactElement } from "react";

import PaginationBar from "@/components/PaginationBar";
import RemoteImage from "@/components/RemoteImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
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
      <div className="flex items-baseline gap-3">
        <h2
          id="project-members-title"
          tabIndex={-1}
          className="rounded-sm text-base font-semibold outline-none data-[locate-highlight]:ring-2 data-[locate-highlight]:ring-ring data-[locate-highlight]:ring-offset-4"
        >
          企划成员
        </h2>
        {data && <span className="text-sm text-muted-foreground">{data.total} 人</span>}
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
          <ul className="mt-2 divide-y" aria-label="当前企划成员">
            {data.list.map((member) => (
              <li key={member.userId} className="flex min-w-0 items-center gap-3 py-4">
                {member.avatarUrl ? (
                  <RemoteImage
                    src={member.avatarUrl}
                    alt=""
                    className="size-9 shrink-0 rounded-full"
                    fallback={member.nickname.slice(0, 1)}
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground"
                  >
                    {member.nickname.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 flex-1 break-words text-sm font-medium">
                  {member.nickname}
                </span>
                {member.isCreator && <Badge variant="outline">负责人</Badge>}
              </li>
            ))}
          </ul>
          <PaginationBar
            page={pageNum}
            pageSize={PROJECT_MEMBERS_PAGE_SIZE}
            total={data.total}
            disabled={membersQuery.isFetching}
            onPageChange={setPageNum}
          />
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
