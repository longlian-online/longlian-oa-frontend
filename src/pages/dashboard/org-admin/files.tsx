import { useEffect, useRef, useState, type MouseEvent, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowUp,
  Download,
  Eye,
  File,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  LayoutGrid,
  List,
  Loader2,
  Trash2,
} from "lucide-react";

import { ApiError } from "@/api/apiError";
import {
  discardOrganizationFile,
  downloadOrganizationFiles,
  getOrganizationFileDownload,
} from "@/api/organizationAdmin";
import {
  closeAttachmentPreview,
  openAttachmentPreview,
} from "@/components/AttachmentPreview/previewSession";
import CenteredLoading from "@/components/CenteredLoading";
import EmptyState from "@/components/EmptyState";
import PaginationBar from "@/components/PaginationBar";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FilterSelectContent from "@/components/FilterSelectContent";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { useConfirm } from "@/hooks/useConfirm";
import { usePageQuery } from "@/hooks/usePageQuery";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ORGANIZATION_FILE_PAGE_SIZE, organizationFilesQuery } from "@/queries/organizationAdmin";
import type { OrgFileEntryVO } from "@/types/organizationAdmin";

import {
  orgFileLocation,
  orgFileSearch,
  parentOrgFileLocation,
  type OrgFileLocation,
  type OrgFileTree,
} from "./fileLocation";
import {
  DirectoryAccessError,
  ensureWritePermission,
  loadSavedDownloads,
  pickDownloadDirectory,
  readDownloadRecords,
  saveDownloadedFiles,
  type DownloadDirectoryHandle,
} from "./downloadDirectory";
import { downloadTarget, isDownloaded, type DownloadRecord } from "./fileDownload";

type ExplorerView = "icons" | "details";
const TREE_LABEL = { planning: "企划", type: "类型", item: "项目" } as const;

function fileIcon(entry: OrgFileEntryVO): typeof File {
  if (entry.kind === "FOLDER") return Folder;
  const mime = entry.fileMime ?? "";
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("text/") || mime === "application/pdf") return FileText;
  return File;
}

function submitterLabel(name?: string): string {
  const trimmed = name?.trim() ?? "";
  return trimmed || "未设置昵称";
}

function OrganizationFilesContent(): ReactElement {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = orgFileLocation(params);
  const [page, setPage] = usePageQuery();
  const listQuery = useApiQuery(organizationFilesQuery(location, page));
  const entries = listQuery.data?.entries ?? [];
  const total = listQuery.data?.total ?? 0;
  const folderPaging = !location.itemId;
  const [view, setView] = useState<ExplorerView>("icons");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [directory, setDirectory] = useState<DownloadDirectoryHandle | null>(null);
  const [directoryName, setDirectoryName] = useState<string | null>(null);
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const anchorRef = useRef<string | null>(null);
  const previewOwner = useRef(Symbol("org-file-preview"));
  const confirm = useConfirm();
  const discardMutation = useApiMutation({
    mutationFn: (entry: OrgFileEntryVO) =>
      discardOrganizationFile(entry.taskInstanceId!, entry.fileId!, entry.fieldKey!),
    invalidate: [["orgFiles"], ["taskDetail"], ["taskVersions"]],
  });
  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.id));
  const selected = selectedEntries.length === 1 ? (selectedEntries[0] ?? null) : null;
  const parent = parentOrgFileLocation(location);

  useEffect(() => {
    setSelectedIds([]);
    anchorRef.current = null;
  }, [location.tree, location.typeId, location.projectId, location.itemId, page]);

  useEffect(() => {
    if (!folderPaging || !listQuery.data) return;
    const lastPage = Math.max(1, Math.ceil(listQuery.data.total / ORGANIZATION_FILE_PAGE_SIZE));
    if (page > lastPage) setPage(lastPage);
  }, [folderPaging, listQuery.data, page, setPage]);

  useEffect(() => () => closeAttachmentPreview(previewOwner.current), []);

  useEffect(() => {
    let cancelled = false;
    void loadSavedDownloads().then((saved) => {
      if (cancelled || !saved) return;
      setDirectory(saved.handle);
      setDirectoryName(saved.name);
      setRecords(saved.records);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function go(next: OrgFileLocation): void {
    const search = orgFileSearch(next);
    void navigate({ pathname: "/dashboard/org-admin/files", search: search ? `?${search}` : "" });
  }

  function selectEntry(id: string, event: MouseEvent): void {
    const ids = entries.map((entry) => entry.id);
    if (event.shiftKey && anchorRef.current) {
      const start = ids.indexOf(anchorRef.current);
      const end = ids.indexOf(id);
      if (start >= 0 && end >= 0) {
        const [from, to] = start < end ? [start, end] : [end, start];
        setSelectedIds(ids.slice(from, to + 1));
        return;
      }
    }
    if (event.metaKey || event.ctrlKey) {
      setSelectedIds((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    } else {
      setSelectedIds([id]);
    }
    anchorRef.current = id;
  }

  function openEntry(entry: OrgFileEntryVO): void {
    if (entry.kind === "FOLDER") {
      if (location.tree === "item") {
        if (!location.itemId) go({ tree: "item", itemId: entry.id });
        return;
      }
      if (location.tree === "type") {
        if (!location.typeId) go({ tree: "type", typeId: entry.id });
        return;
      }
      if (!location.projectId) {
        go({ tree: "planning", projectId: entry.id });
        return;
      }
      if (!location.itemId)
        go({ tree: "planning", projectId: location.projectId, itemId: entry.id });
      return;
    }
    if (entry.availability === "available") preview(entry);
  }

  function preview(entry: OrgFileEntryVO): void {
    if (!entry.taskInstanceId || !entry.fileId || entry.availability !== "available") return;
    openAttachmentPreview({
      owner: previewOwner.current,
      fileName: entry.name,
      fileSize: entry.fileSize ?? undefined,
      resolveUrl: async () => {
        const { readUrl } = await getOrganizationFileDownload(entry.taskInstanceId!, entry.fileId!);
        return readUrl;
      },
    });
  }

  function reportDownloadError(error: unknown): void {
    if (error instanceof DOMException && error.name === "AbortError") return;
    if (error instanceof DirectoryAccessError) {
      $tip(error.message, "error");
      return;
    }
    if (error instanceof ApiError) {
      error.silence();
      $tip(error.message, "error");
      return;
    }
    $tip("下载失败，请稍后重试", "error");
  }

  async function chooseDirectory(): Promise<void> {
    if (downloading) return;
    try {
      const handle = await pickDownloadDirectory();
      const next = await readDownloadRecords(handle);
      setDirectory(handle);
      setDirectoryName(handle.name);
      setRecords(next);
    } catch (error) {
      reportDownloadError(error);
    }
  }

  async function downloadSelected(): Promise<void> {
    const targets = selectedEntries
      .map((entry) => downloadTarget(entry, location))
      .filter((target) => target !== null);
    if (targets.length === 0 || downloading) return;
    setDownloading(true);
    setDownloadProgress(null);
    try {
      let handle = directory;
      if (!handle) handle = await pickDownloadDirectory();
      else if (!(await ensureWritePermission(handle))) {
        $tip("需要允许写入所选文件夹", "error");
        return;
      }
      const existing = await readDownloadRecords(handle);
      setDirectory(handle);
      setDirectoryName(handle.name);
      setRecords(existing);
      const batch = await downloadOrganizationFiles(targets);
      if (batch.files.length === 0) {
        $tip("没有可下载的文件", "error");
        return;
      }
      const failed = await saveDownloadedFiles(
        handle,
        existing,
        batch.files,
        async (file) => {
          try {
            const fresh = await getOrganizationFileDownload(file.taskInstanceId, file.fileId);
            return fresh.readUrl;
          } catch (error) {
            if (error instanceof ApiError) error.silence();
            throw error;
          }
        },
        (next, done, total) => {
          setRecords(next);
          setDownloadProgress({ done, total });
        },
      );
      if (failed > 0) $tip(`${failed} 个文件没有下载`, "error");
      else $tip("下载完成", "success");
    } catch (error) {
      reportDownloadError(error);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  }

  function moveSelection(offset: number): void {
    if (entries.length === 0) return;
    const current = selectedIds.length === 1 ? selectedIds[0] : selectedIds[selectedIds.length - 1];
    const index = entries.findIndex((entry) => entry.id === current);
    const next = entries[(Math.max(index, 0) + offset + entries.length) % entries.length];
    if (!next) return;
    setSelectedIds([next.id]);
    anchorRef.current = next.id;
  }

  const projectTitle = listQuery.data?.projectTitle || "企划";
  const itemTitle = listQuery.data?.itemTitle || "项目";
  const canOpenFile = selected?.kind === "FILE" && selected.availability === "available";
  const canDiscard = selected?.kind === "FILE" && Boolean(selected.fieldKey && selected.fileId);
  const canDownload =
    !downloading && selectedEntries.some((entry) => downloadTarget(entry, location) !== null);

  async function discardSelected(): Promise<void> {
    if (!selected || !canDiscard || discardMutation.isPending) return;
    const confirmed = await confirm({
      title: "删除这个文件？",
      description: `「${selected.name}」会从文件页消失，并标记为弃置。任务详情、历史版本和暂存里如果还引用它，会变成不可用。`,
      confirmText: "删除",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await discardMutation.mutateAsync(selected);
      setSelectedIds([]);
      anchorRef.current = null;
      $tip("文件已删除", "success");
    } catch {
      /* QueryClient 统一显示最终错误。 */
    }
  }
  const emptyText = location.itemId
    ? "这个项目还没有提交文件"
    : location.tree === "item"
      ? "这个组织还没有项目"
      : location.projectId
        ? "这个企划还没有项目"
        : location.typeId
          ? "这个类型还没有提交文件"
          : location.tree === "type"
            ? "这个组织还没有企划类型"
            : "这个组织还没有企划";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">文件</h1>
      <section className="border-border bg-card flex h-[calc(100svh-13.5rem)] min-h-96 flex-col overflow-hidden rounded-xl border">
        <div className="border-border flex flex-wrap items-center gap-1 border-b px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="向上"
            disabled={!parent}
            onClick={() => parent && go(parent)}
          >
            <ArrowUp />
          </Button>
          <nav
            aria-label="当前位置"
            className="bg-background flex min-w-0 flex-1 items-center gap-1 rounded-md border px-2 py-1 text-sm"
          >
            <button
              type="button"
              className="shrink-0 rounded px-1 hover:bg-secondary"
              onClick={() => go({ tree: location.tree })}
            >
              本组织
            </button>
            {location.tree === "type" && location.typeId && (
              <>
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  className="max-w-48 truncate rounded px-1 hover:bg-secondary"
                  onClick={() => go({ tree: "type", typeId: location.typeId })}
                >
                  {listQuery.data?.typeName || "类型"}
                </button>
              </>
            )}
            {location.tree !== "item" && location.projectId && (
              <>
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  className="max-w-48 truncate rounded px-1 hover:bg-secondary"
                  onClick={() =>
                    go({
                      tree: location.tree,
                      typeId: location.typeId,
                      projectId: location.projectId,
                    })
                  }
                >
                  {projectTitle}
                </button>
              </>
            )}
            {location.itemId && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="max-w-48 truncate px-1 text-foreground">{itemTitle}</span>
              </>
            )}
          </nav>
          <Select
            value={location.tree}
            onValueChange={(value) => {
              if (value !== "planning" && value !== "type" && value !== "item") return;
              if (value !== location.tree) go({ tree: value });
            }}
          >
            <SelectTrigger aria-label="目录" className="w-24">
              <SelectValue>{TREE_LABEL[location.tree]}</SelectValue>
            </SelectTrigger>
            <FilterSelectContent>
              {(Object.keys(TREE_LABEL) as OrgFileTree[]).map((tree) => (
                <SelectItem key={tree} value={tree}>
                  {TREE_LABEL[tree]}
                </SelectItem>
              ))}
            </FilterSelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canOpenFile}
            onClick={() => selected && preview(selected)}
          >
            <Eye />
            预览
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-40"
            title={directoryName ?? undefined}
            disabled={downloading}
            onClick={() => void chooseDirectory()}
          >
            <FolderOpen />
            <span className="truncate">{directoryName ?? "下载位置"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canDownload}
            onClick={() => void downloadSelected()}
          >
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            {downloadProgress ? `${downloadProgress.done}/${downloadProgress.total}` : "下载"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!canDiscard || discardMutation.isPending}
            onClick={() => void discardSelected()}
          >
            {discardMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            删除
          </Button>
          <Button
            type="button"
            variant={view === "icons" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="大图标"
            aria-pressed={view === "icons"}
            onClick={() => setView("icons")}
          >
            <LayoutGrid />
          </Button>
          <Button
            type="button"
            variant={view === "details" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="详细信息"
            aria-pressed={view === "details"}
            onClick={() => setView("details")}
          >
            <List />
          </Button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-auto outline-none"
          tabIndex={0}
          role="listbox"
          aria-label="文件"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowRight") {
              event.preventDefault();
              moveSelection(1);
            } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
              event.preventDefault();
              moveSelection(-1);
            } else if (event.key === "Enter" && selected) {
              event.preventDefault();
              openEntry(selected);
            } else if (event.key === "Backspace" && parent) {
              event.preventDefault();
              go(parent);
            }
          }}
        >
          {listQuery.isLoading ? (
            <CenteredLoading message="正在读取文件夹" />
          ) : listQuery.isError ? (
            <EmptyState title="文件列表加载失败" description="请稍后重试。" />
          ) : entries.length === 0 && total === 0 ? (
            <EmptyState
              title={emptyText}
              description={
                location.itemId
                  ? "任务提交文件后会出现在这里。"
                  : location.projectId || location.tree === "item"
                    ? "创建项目后会出现在这里。"
                    : location.typeId
                      ? "任务提交文件后会出现在这里。"
                      : location.tree === "type"
                        ? "添加企划类型后会出现在这里。"
                        : "创建企划后会出现在这里。"
              }
            />
          ) : view === "icons" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2 p-3">
              {entries.map((entry) => (
                <IconEntry
                  key={entry.id}
                  entry={entry}
                  selected={selectedIds.includes(entry.id)}
                  downloaded={isDownloaded(records, entry)}
                  onSelect={(event) => selectEntry(entry.id, event)}
                  onOpen={() => openEntry(entry)}
                />
              ))}
            </div>
          ) : (
            <DetailsTable
              entries={entries}
              selectedIds={selectedIds}
              onSelect={selectEntry}
              onOpen={openEntry}
              downloaded={(entry) => isDownloaded(records, entry)}
            />
          )}
        </div>
        {folderPaging && total > ORGANIZATION_FILE_PAGE_SIZE && (
          <div className="border-border border-t px-3 py-2">
            <PaginationBar
              page={page}
              pageSize={ORGANIZATION_FILE_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        )}
        <div className="border-border text-muted-foreground flex items-center justify-between border-t px-3 py-1.5 text-xs">
          <span>共 {total} 项</span>
          <span className="truncate">
            {selectedEntries.length > 1
              ? `已选 ${selectedEntries.length} 项`
              : selected?.kind === "FILE"
                ? `${selected.taskName ?? "任务"} · ${selected.fieldLabel ?? "文件"}`
                : (selected?.name ?? "")}
          </span>
        </div>
      </section>
    </div>
  );
}

function IconEntry({
  entry,
  selected,
  downloaded,
  onSelect,
  onOpen,
}: {
  entry: OrgFileEntryVO;
  selected: boolean;
  downloaded: boolean;
  onSelect: (event: MouseEvent) => void;
  onOpen: () => void;
}): ReactElement {
  const Icon = fileIcon(entry);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      title={entry.name}
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 rounded-lg px-2 py-3 text-center",
        selected
          ? "bg-foreground/15 text-foreground ring-1 ring-foreground/30 ring-inset"
          : "hover:bg-foreground/10",
        entry.availability === "unavailable" && "opacity-60",
      )}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      <Icon
        className={cn(
          "size-10",
          entry.kind === "FOLDER" ? "text-foreground" : "text-muted-foreground",
        )}
      />
      <span className="line-clamp-2 w-full break-all text-xs">{entry.name}</span>
      {downloaded && <Badge variant="outline">已下载</Badge>}
      {entry.subtitle && (
        <span className="line-clamp-1 w-full text-[11px] text-muted-foreground">
          {entry.subtitle}
        </span>
      )}
      {entry.kind === "FILE" && (
        <span className="line-clamp-1 w-full text-[11px] text-muted-foreground">
          {entry.taskName}
        </span>
      )}
    </button>
  );
}

function DetailsTable({
  entries,
  selectedIds,
  downloaded,
  onSelect,
  onOpen,
}: {
  entries: OrgFileEntryVO[];
  selectedIds: string[];
  downloaded: (entry: OrgFileEntryVO) => boolean;
  onSelect: (id: string, event: MouseEvent) => void;
  onOpen: (entry: OrgFileEntryVO) => void;
}): ReactElement {
  return (
    <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
      <thead className="text-muted-foreground sticky top-0 bg-card text-left text-xs">
        <tr>
          <th className="border-border border-b px-3 py-2 font-medium">名称</th>
          <th className="border-border border-b px-3 py-2 font-medium">任务</th>
          <th className="border-border border-b px-3 py-2 font-medium">提交人</th>
          <th className="border-border border-b px-3 py-2 font-medium">提交时间</th>
          <th className="border-border border-b px-3 py-2 font-medium">大小</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const Icon = fileIcon(entry);
          const selected = selectedIds.includes(entry.id);
          return (
            <tr
              key={entry.id}
              role="option"
              aria-selected={selected}
              className={cn(
                "cursor-default",
                selected ? "bg-foreground/15" : "hover:bg-foreground/10",
              )}
              onClick={(event) => onSelect(entry.id, event)}
              onDoubleClick={() => onOpen(entry)}
            >
              <td className="max-w-64 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate" title={entry.name}>
                    {entry.name}
                  </span>
                  {downloaded(entry) && <Badge variant="outline">已下载</Badge>}
                </span>
              </td>
              <td className="text-muted-foreground max-w-40 truncate px-3 py-2">
                {entry.kind === "FILE"
                  ? [entry.subtitle, entry.taskName].filter(Boolean).join(" · ")
                  : (entry.subtitle ?? "文件夹")}
              </td>
              <td className="text-muted-foreground px-3 py-2">
                {entry.kind === "FILE" ? submitterLabel(entry.submitterName) : "—"}
              </td>
              <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                {entry.kind === "FILE" ? formatDate(entry.submittedAt) : "—"}
              </td>
              <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                {entry.kind === "FILE" && entry.fileSize != null
                  ? formatBytes(entry.fileSize)
                  : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function OrganizationFilesPage(): ReactElement {
  return (
    <OrganizationAdminGuard>
      <OrganizationFilesContent />
    </OrganizationAdminGuard>
  );
}
