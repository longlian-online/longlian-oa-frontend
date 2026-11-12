import { useState } from "react";
import { Check, Clock3, Loader2, UserRound, X } from "lucide-react";

import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import { usePageQuery } from "@/hooks/usePageQuery";
import { useListQueryState, useListSearchDraft } from "@/hooks/useListQueryState";
import { reviewJoinApplication } from "@/api/organizationAdmin";
import CenteredLoading from "@/components/CenteredLoading";
import EmptyState from "@/components/EmptyState";
import KeywordSearch from "@/components/KeywordSearch";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PaginationBar from "@/components/PaginationBar";
import RemoteImage from "@/components/RemoteImage";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

import {
  ORGANIZATION_ADMIN_PAGE_SIZE as PAGE_SIZE,
  organizationApplicationsQuery,
} from "@/queries/organizationAdmin";
import type { JoinApplicationReviewDTO, JoinApplicationVO } from "@/types/organizationAdmin";

function applicationName(application: JoinApplicationVO): string {
  return application.nickname || application.username || application.userId;
}

type ReviewAction = Extract<JoinApplicationReviewDTO["applicationStatus"], "APPROVED" | "REJECTED">;

function OrganizationApplicationsContent() {
  const reviewJoinApplicationMutation = useApiMutation<
    Awaited<ReturnType<typeof reviewJoinApplication>>,
    Parameters<typeof reviewJoinApplication>
  >({
    mutationFn: (args) => reviewJoinApplication(...args),
    invalidate: [["applications"], ["members"], ["memberSubmitCounts"], ["currentUser"]],
  });
  const [{ keyword }, update] = useListQueryState({ keyword: "" });
  const [searchText, setSearchText] = useListSearchDraft(keyword);
  const [page, setPage] = usePageQuery();
  const [reviewing, setReviewing] = useState<JoinApplicationVO | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction>("APPROVED");
  const [reviewRemark, setReviewRemark] = useState("");
  const reviewLoading = reviewJoinApplicationMutation.isPending;

  const listQuery = useApiQuery(organizationApplicationsQuery(keyword, page));
  const applications = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;

  function handleSearch(): void {
    update({ keyword: searchText.trim() });
  }

  function openReview(application: JoinApplicationVO, action: ReviewAction): void {
    setReviewing(application);
    setReviewAction(action);
    setReviewRemark("");
  }

  async function handleReview(): Promise<void> {
    try {
      if (!reviewing) return;
      await reviewJoinApplicationMutation.mutateAsync([
        reviewing.id,
        {
          applicationStatus: reviewAction,
          reviewRemark: reviewRemark.trim() || undefined,
        },
      ]);
      $tip(reviewAction === "APPROVED" ? "已通过入组申请" : "已拒绝入组申请", "success");
      setReviewing(null);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">入组申请</h1>
        </div>
        <div className="flex gap-2">
          <KeywordSearch
            value={searchText}
            placeholder="搜索申请人"
            onChange={setSearchText}
            onSearch={handleSearch}
          />
        </div>
      </div>

      {listQuery.isError && !listQuery.data ? (
        <Button variant="outline" onClick={() => void listQuery.refetch()}>
          加载失败，重试
        </Button>
      ) : loading ? (
        <CenteredLoading message="正在加载申请..." />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<Clock3 className="size-5 text-muted-foreground" />}
          title="暂无入组申请"
          description="当前没有待审核的入组申请。"
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申请人</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {application.avatarUrl ? (
                          <RemoteImage
                            src={application.avatarUrl}
                            alt=""
                            className="size-6 rounded-full"
                            fallback={<UserRound className="size-4" />}
                          />
                        ) : (
                          <div className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <UserRound className="size-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {applicationName(application)}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {application.username || application.userId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(application.appliedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">待审核</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openReview(application, "APPROVED")}
                        >
                          <Check className="size-4" />
                          通过
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openReview(application, "REJECTED")}
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
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            disabled={loading}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog open={reviewing !== null} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "APPROVED" ? "通过入组申请" : "拒绝入组申请"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={reviewRemark}
            aria-label="审核备注"
            className="min-h-24"
            maxLength={200}
            onChange={(event) => setReviewRemark(event.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReviewing(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant={reviewAction === "REJECTED" ? "destructive" : "default"}
              disabled={reviewLoading}
              onClick={() => void handleReview()}
            >
              {reviewLoading && <Loader2 className="size-4 animate-spin" />}
              确认{reviewAction === "APPROVED" ? "通过" : "拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrganizationApplicationsPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationApplicationsContent />
    </OrganizationAdminGuard>
  );
}
