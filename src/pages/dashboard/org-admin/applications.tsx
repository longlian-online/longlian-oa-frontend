import { useEffect, useState } from "react";
import { Check, Clock3, Loader2, Search, UserRound, X } from "lucide-react";

import { getJoinApplications, reviewJoinApplication } from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JoinApplicationReviewDTO, JoinApplicationVO } from "@/types/organizationAdmin";

const PAGE_SIZE = 10;

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}

function applicationName(application: JoinApplicationVO): string {
  return application.nickname || application.username || application.userId;
}

type ReviewAction = Extract<JoinApplicationReviewDTO["applicationStatus"], "APPROVED" | "REJECTED">;

function OrganizationApplicationsContent() {
  const [applications, setApplications] = useState<JoinApplicationVO[]>([]);
  const [searchText, setSearchText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<JoinApplicationVO | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction>("APPROVED");
  const [reviewRemark, setReviewRemark] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    void loadApplications();
  }, [keyword, page]);

  async function loadApplications(): Promise<void> {
    try {
      setLoading(true);
      const result = await getJoinApplications({
        pageNum: page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        orderDir: "DESC",
      });
      setApplications(result.list);
      setTotal(result.total);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "入组申请加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function openReview(application: JoinApplicationVO, action: ReviewAction): void {
    setReviewing(application);
    setReviewAction(action);
    setReviewRemark("");
  }

  async function handleReview(): Promise<void> {
    if (!reviewing) return;
    try {
      setReviewLoading(true);
      await reviewJoinApplication(reviewing.id, {
        applicationStatus: reviewAction,
        reviewRemark: reviewRemark.trim() || undefined,
      });
      $tip(reviewAction === "APPROVED" ? "已通过入组申请" : "已拒绝入组申请", "success");
      setReviewing(null);
      await loadApplications();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "入组申请审核失败", "error");
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">入组申请</h1>
          <p className="mt-1 text-sm text-muted-foreground">审核用户加入当前组织的申请。</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              placeholder="搜索申请人"
              className="pl-9"
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          正在加载申请...
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<Clock3 className="size-5 text-muted-foreground" />}
          title="暂无入组申请"
          description="当前没有待审核的入组申请。"
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申请人</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-44 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {application.avatarUrl ? (
                          <img
                            src={application.avatarUrl}
                            alt=""
                            className="size-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
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
                          onClick={() => openReview(application, "APPROVED")}
                        >
                          <Check className="size-4" />
                          通过
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "APPROVED" ? "通过入组申请" : "拒绝入组申请"}
            </DialogTitle>
            <DialogDescription>
              {reviewing
                ? `正在处理「${applicationName(reviewing)}」的入组申请。`
                : "请确认审核结果。"}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reviewRemark}
            placeholder="审核备注（可选）"
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
