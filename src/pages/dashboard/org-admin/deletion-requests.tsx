import { useState } from "react";
import { Link } from "react-router";
import { Check, Clock3, ExternalLink, Loader2, X } from "lucide-react";

import { reviewDeletionRequest } from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { formatDate } from "@/lib/format";
import {
  ORGANIZATION_ADMIN_PAGE_SIZE as PAGE_SIZE,
  organizationDeletionRequestsQuery,
} from "@/queries/organizationAdmin";
import type { DeletionRequestVO } from "@/types/organizationAdmin";

function targetPath(request: DeletionRequestVO): string {
  if (request.targetType === "ITEM") {
    return `/dashboard/planning/${request.projectId}/items/${request.targetId}`;
  }
  return `/dashboard/planning/${request.projectId}`;
}

function DeletionRequestsContent() {
  const [page, setPage] = useState(1);
  const listQuery = useApiQuery(organizationDeletionRequestsQuery(page));
  const requests = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const reviewMutation = useApiMutation({
    mutationFn: (input: { id: string; status: "APPROVED" | "REJECTED" }) =>
      reviewDeletionRequest(input.id, { status: input.status }),
    invalidate: [["deletionRequests"], ["projects"], ["items"], ["workshop"], ["plaza"]],
  });

  async function review(
    request: DeletionRequestVO,
    status: "APPROVED" | "REJECTED",
  ): Promise<void> {
    try {
      await reviewMutation.mutateAsync({ id: request.id, status });
      $tip(status === "APPROVED" ? "已通过并删除" : "已拒绝删除申请", "success");
      if (requests.length === 1 && page > 1) setPage(page - 1);
    } catch {
      /* QueryClient 统一显示最终错误。 */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">删除请求</h1>
      </div>
      {listQuery.isError && !listQuery.data ? (
        <Button variant="outline" onClick={() => void listQuery.refetch()}>
          加载失败，重试
        </Button>
      ) : listQuery.isLoading ? (
        <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          正在加载删除请求...
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Clock3 className="size-5 text-muted-foreground" />}
          title="暂无删除请求"
          description="当前没有待审核的删除申请。"
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>原因</TableHead>
                  <TableHead>申请人</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead className="w-56 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {request.targetType === "ITEM" ? "项目" : "企划"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-medium">{request.title}</TableCell>
                    <TableCell className="max-w-72 truncate text-muted-foreground">
                      {request.reason}
                    </TableCell>
                    <TableCell>{request.requesterName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link to={targetPath(request)} />}
                        >
                          <ExternalLink className="size-4" />
                          查看
                        </Button>
                        <Button
                          size="sm"
                          disabled={reviewMutation.isPending}
                          onClick={() => void review(request, "APPROVED")}
                        >
                          <Check className="size-4" />
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewMutation.isPending}
                          onClick={() => void review(request, "REJECTED")}
                        >
                          <X className="size-4" />
                          拒绝
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function OrganizationDeletionRequestsPage() {
  return (
    <OrganizationAdminGuard>
      <DeletionRequestsContent />
    </OrganizationAdminGuard>
  );
}
