import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowUp,
  Download,
  Eye,
  File,
  FileImage,
  FileText,
  Folder,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";

import { ApiError } from "@/api/apiError";
import {
  discardOrganizationFile,
  expandOrganizationFiles,
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import FilterSelectContent from "@/components/FilterSelectContent";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiMutation, useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { useConfirm } from "@/hooks/useConfirm";
import { usePageQuery } from "@/hooks/usePageQuery";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ORGANIZATION_FILE_PAGE_SIZE, organizationFilesQuery } from "@/queries/organizationAdmin";
import type { OrgFileExpansionTarget, OrgFileEntryVO } from "@/types/organizationAdmin";

import {
  orgFileLocation,
  orgFileSearch,
  parentOrgFileLocation,
  type OrgFileLeafView,
  type OrgFileLocation,
} from "./fileLocation";
import {
  DirectoryAccessError,
  ensureWritePermission,
  loadOrgDirectory,
  saveDownloadedFiles,
} from "./downloadDirectory";
import {
  beginDownload,
  finishDownload,
  getDownloadSession,
  noteDownloadProgress,
  rememberDownloadDirectory,
  subscribeDownloadSession,
} from "./downloadSession";
import { downloadTarget, fileKey } from "./fileDownload";

type ExplorerView = "icons" | "details";
const LEAF_LABEL: Record<OrgFileLeafView, string> = { task: "任务", item: "项目" };

interface RemoteFile {
  taskInstanceId: string;
  fileId: string;
  fieldKey: string;
  name: string;
}

function directRemoteFiles(entries: OrgFileEntryVO[]): RemoteFile[] {
  return entries.flatMap((entry) => {
    if (entry.kind !== "FILE" || !entry.taskInstanceId || !entry.fileId || !entry.fieldKey) {
      return [];
    }
    return [
      {
        taskInstanceId: entry.taskInstanceId,
        fileId: entry.fileId,
        fieldKey: entry.fieldKey,
        name: entry.name,
      },
    ];
  });
}

function dedupeRemote(files: RemoteFile[]): RemoteFile[] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = fileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasActionTarget(entry: OrgFileEntryVO, location: OrgFileLocation): boolean {
  if (entry.kind === "FILE") return Boolean(entry.taskInstanceId && entry.fileId && entry.fieldKey);
  return downloadTarget(entry, location) !== null;
}

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

function FileActionMenu({
  x,
  y,
  onClose,
  children,
}: {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
}): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [pos, setPos] = useState({ x, y });
  useLayoutEffect(() => {
    const node = panelRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const margin = 8;
    setPos({
      x: Math.max(margin, Math.min(x, window.innerWidth - rect.width - margin)),
      y: Math.max(margin, Math.min(y, window.innerHeight - rect.height - margin)),
    });
  }, [x, y]);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    function close(): void {
      onCloseRef.current();
    }
    function onPointerDown(event: PointerEvent): void {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);
  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="文件操作"
      className="fixed z-50 min-w-44 rounded-lg border bg-popover p-1 text-sm text-popover-foreground ring-1 ring-foreground/10 [&_svg]:size-4"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  );
}

function MenuAction({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof File;
  label: string;
  disabled: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      onClick={onClick}
    >
      <Icon />
      {label}
    </button>
  );
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
  const [downloadRequest, setDownloadRequest] = useState<{
    targets: OrgFileExpansionTarget[];
    location: OrgFileLocation;
  } | null>(null);
  const [downloadView, setDownloadView] = useState<OrgFileLeafView>("item");
  const [multiSelect, setMultiSelect] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; entryId: string } | null>(null);
  const multiSelectId = useId();
  const orgId = useSessionSnapshot().orgId;
  const downloadSession = useSyncExternalStore(
    subscribeDownloadSession,
    getDownloadSession,
    getDownloadSession,
  );
  const downloading = downloadSession.running;
  const downloadProgress = downloadSession.progress;
  const anchorRef = useRef<string | null>(null);
  const selectionGuard = useRef(false);
  const marqueeGuard = useRef(false);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const previewOwner = useRef(Symbol("org-file-preview"));
  const confirm = useConfirm();
  const discardMutation = useApiMutation({
    mutationFn: async (files: RemoteFile[]) => {
      let failed = 0;
      let lastError: unknown;
      for (const file of files) {
        try {
          await discardOrganizationFile(file.taskInstanceId, file.fileId, file.fieldKey);
        } catch (error) {
          failed += 1;
          lastError = error;
        }
      }
      if (failed === files.length && lastError) throw lastError;
      return failed;
    },
    invalidate: [["orgFiles"], ["taskDetail"], ["taskVersions"]],
  });
  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.id));
  const selected = selectedEntries.length === 1 ? (selectedEntries[0] ?? null) : null;
  const parent = parentOrgFileLocation(location);

  useEffect(() => {
    setSelectedIds([]);
    anchorRef.current = null;
    setMenu(null);
  }, [location.view, location.typeId, location.projectId, location.itemId, location.taskId, page]);

  useEffect(() => {
    if (!folderPaging || !listQuery.data) return;
    const lastPage = Math.max(1, Math.ceil(listQuery.data.total / ORGANIZATION_FILE_PAGE_SIZE));
    if (page > lastPage) setPage(lastPage);
  }, [folderPaging, listQuery.data, page, setPage]);

  useEffect(() => () => closeAttachmentPreview(previewOwner.current), []);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    void loadOrgDirectory(orgId).then((saved) => {
      if (cancelled) return;
      rememberDownloadDirectory(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  function go(next: OrgFileLocation): void {
    const search = orgFileSearch(next);
    void navigate({ pathname: "/dashboard/org-admin/files", search: search ? `?${search}` : "" });
  }

  function applySelection(id: string, event: MouseEvent): void {
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
    if (multiSelect || event.metaKey || event.ctrlKey) {
      setSelectedIds((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    } else {
      setSelectedIds([id]);
    }
    anchorRef.current = id;
  }

  function selectEntry(id: string, event: MouseEvent): void {
    if (marqueeGuard.current) return;
    if ((event.ctrlKey || event.metaKey || event.shiftKey) && selectionGuard.current) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      selectionGuard.current = true;
      queueMicrotask(() => {
        selectionGuard.current = false;
      });
    }
    applySelection(id, event);
  }

  function beginMarquee(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return;
    const list = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    const additive = multiSelect || event.shiftKey || event.ctrlKey || event.metaKey;
    const base = additive ? selectedIds : [];
    let active = false;
    const move = (ev: PointerEvent): void => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!active && dx * dx + dy * dy < 16) return;
      if (!active) {
        active = true;
        try {
          list.setPointerCapture(ev.pointerId);
        } catch {
          /* 拖出列表后再捕获；测试环境可能没有指针捕获。 */
        }
      }
      const box = {
        left: Math.min(startX, ev.clientX),
        top: Math.min(startY, ev.clientY),
        right: Math.max(startX, ev.clientX),
        bottom: Math.max(startY, ev.clientY),
      };
      const frame = marqueeRef.current;
      if (frame) {
        frame.hidden = false;
        frame.style.left = `${box.left}px`;
        frame.style.top = `${box.top}px`;
        frame.style.width = `${box.right - box.left}px`;
        frame.style.height = `${box.bottom - box.top}px`;
      }
      const hits: string[] = [];
      for (const node of list.querySelectorAll<HTMLElement>("[data-entry-id]")) {
        const id = node.dataset.entryId;
        if (!id) continue;
        const bounds = node.getBoundingClientRect();
        if (
          bounds.left < box.right &&
          bounds.right > box.left &&
          bounds.top < box.bottom &&
          bounds.bottom > box.top
        ) {
          hits.push(id);
        }
      }
      const next = additive ? [...new Set([...base, ...hits])] : hits;
      setSelectedIds(next);
      anchorRef.current = next[next.length - 1] ?? anchorRef.current;
    };
    const stop = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      if (marqueeRef.current) marqueeRef.current.hidden = true;
      if (!active) return;
      marqueeGuard.current = true;
      window.setTimeout(() => {
        marqueeGuard.current = false;
      }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  function openContextMenu(entry: OrgFileEntryVO, event: MouseEvent): void {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      selectEntry(entry.id, event);
      return;
    }
    setSelectedIds((current) => (current.includes(entry.id) ? current : [entry.id]));
    anchorRef.current = entry.id;
    setMenu({ x: event.clientX, y: event.clientY, entryId: entry.id });
  }

  function openEntry(entry: OrgFileEntryVO): void {
    if (entry.kind === "FOLDER") {
      if (!location.typeId) {
        go({ view: "item", typeId: entry.id });
        return;
      }
      if (!location.projectId) {
        go({ view: "item", typeId: location.typeId, projectId: entry.id });
        return;
      }
      if (location.view === "task") {
        if (!location.taskId) {
          go({
            view: "task",
            typeId: location.typeId,
            projectId: location.projectId,
            taskId: entry.id,
          });
        }
        return;
      }
      if (!location.itemId) {
        go({
          view: "item",
          typeId: location.typeId,
          projectId: location.projectId,
          itemId: entry.id,
        });
      }
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

  function chooseDownloadView(): void {
    const targets = selectedEntries
      .map((entry) => downloadTarget(entry, location))
      .filter((target) => target !== null);
    if (!getDownloadSession().directory) {
      $tip("请先在个人设置中选择存放位置", "error");
      return;
    }
    if (targets.length === 0 || getDownloadSession().running) return;
    setDownloadView(location.view);
    setDownloadRequest({ targets, location });
  }

  async function downloadSelected(): Promise<void> {
    const request = downloadRequest;
    const handle = getDownloadSession().directory;
    if (!request || getDownloadSession().running) return;
    if (!handle) {
      $tip("请先在个人设置中选择存放位置", "error");
      return;
    }
    setDownloadRequest(null);
    beginDownload();
    try {
      if (!(await ensureWritePermission(handle))) {
        $tip("需要允许写入所选文件夹", "error");
        return;
      }
      const batch = await expandOrganizationFiles(request.targets);
      if (batch.files.length === 0) {
        $tip("没有可下载的文件", "error");
        return;
      }
      const failed = await saveDownloadedFiles(
        handle,
        batch.files,
        request.location,
        downloadView,
        async (file) => {
          try {
            const fresh = await getOrganizationFileDownload(file.taskInstanceId, file.fileId);
            return fresh.readUrl;
          } catch (error) {
            if (error instanceof ApiError) error.silence();
            throw error;
          }
        },
        noteDownloadProgress,
      );
      if (failed > 0) $tip(`${failed} 个文件没有下载`, "error");
      else $tip("下载完成", "success");
    } catch (error) {
      reportDownloadError(error);
    } finally {
      finishDownload();
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

  const hasTargets = selectedEntries.some((entry) => hasActionTarget(entry, location));
  const menuEntry = menu ? (entries.find((entry) => entry.id === menu.entryId) ?? null) : null;
  const canPreview = menuEntry?.kind === "FILE" && menuEntry.availability === "available";
  const busy = downloading || discardMutation.isPending;
  const canDownload =
    !busy && selectedEntries.some((entry) => downloadTarget(entry, location) !== null);
  const canDiscardRemote = !busy && hasTargets;

  async function filesForSelection(): Promise<RemoteFile[]> {
    const direct = directRemoteFiles(selectedEntries);
    const folders = selectedEntries
      .map((entry) => downloadTarget(entry, location))
      .filter(
        (target): target is Exclude<OrgFileExpansionTarget, { kind: "FILE" }> =>
          target !== null && target.kind !== "FILE",
      );
    const expanded =
      folders.length === 0
        ? []
        : (await expandOrganizationFiles(folders)).files.map((file) => ({
            taskInstanceId: file.taskInstanceId,
            fileId: file.fileId,
            fieldKey: file.fieldKey,
            name: file.fileName,
          }));
    return dedupeRemote([...direct, ...expanded]);
  }

  async function discardSelected(): Promise<void> {
    if (!canDiscardRemote || discardMutation.isPending) return;
    let files: RemoteFile[];
    try {
      files = await filesForSelection();
    } catch (error) {
      reportDownloadError(error);
      return;
    }
    if (files.length === 0) {
      $tip("没有可删除的文件", "error");
      return;
    }
    const first = files[0];
    if (!first) return;
    const confirmed = await confirm({
      title: files.length === 1 ? "删除这个远程文件？" : `删除这 ${files.length} 个远程文件？`,
      description:
        files.length === 1
          ? `「${first.name}」会从文件页消失，并标记为弃置。任务详情、历史版本和暂存里如果还引用它，会变成不可用。`
          : "这些文件会从文件页消失，并标记为弃置。任务详情、历史版本和暂存里如果还引用它们，会变成不可用。",
      confirmText: "删除远程文件",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const failed = await discardMutation.mutateAsync(files);
      setSelectedIds([]);
      anchorRef.current = null;
      setMenu(null);
      if (failed > 0) $tip(`${failed} 个文件没有删除`, "error");
      else $tip("远程文件已删除", "success");
    } catch {
      /* QueryClient 统一显示最终错误。 */
    }
  }

  const projectTitle = listQuery.data?.projectTitle || "企划";
  const itemTitle = listQuery.data?.itemTitle || "项目";
  const taskTitle = listQuery.data?.taskName || "任务";
  const emptyText = location.itemId
    ? "这个项目还没有提交文件"
    : location.taskId
      ? "这个任务还没有提交文件"
      : location.projectId
        ? location.view === "task"
          ? "这个企划还没有任务"
          : "这个企划还没有项目"
        : location.typeId
          ? "这个类型还没有企划"
          : "这个组织还没有企划类型";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">文件</h1>
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
              onClick={() => go({ view: "item" })}
            >
              本组织
            </button>
            {location.typeId && (
              <>
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  className="max-w-48 truncate rounded px-1 hover:bg-secondary"
                  onClick={() => go({ view: "item", typeId: location.typeId })}
                >
                  {listQuery.data?.typeName || "类型"}
                </button>
              </>
            )}
            {location.projectId && (
              <>
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  className="max-w-48 truncate rounded px-1 hover:bg-secondary"
                  onClick={() =>
                    go({
                      view: location.view,
                      typeId: location.typeId,
                      projectId: location.projectId,
                    })
                  }
                >
                  {projectTitle}
                </button>
              </>
            )}
            {(location.itemId || location.taskId) && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="max-w-48 truncate px-1 text-foreground">
                  {location.taskId ? taskTitle : itemTitle}
                </span>
              </>
            )}
          </nav>
          {location.projectId && (
            <>
              <span className="text-muted-foreground shrink-0 text-sm">视图：</span>
              <Select
                value={location.view}
                onValueChange={(value) => {
                  if (value !== "task" && value !== "item") return;
                  if (value !== location.view) {
                    go({ view: value, typeId: location.typeId, projectId: location.projectId });
                  }
                }}
              >
                <SelectTrigger aria-label="视图" className="w-24">
                  <SelectValue>{LEAF_LABEL[location.view]}</SelectValue>
                </SelectTrigger>
                <FilterSelectContent>
                  {(Object.keys(LEAF_LABEL) as OrgFileLeafView[]).map((leaf) => (
                    <SelectItem key={leaf} value={leaf}>
                      {LEAF_LABEL[leaf]}
                    </SelectItem>
                  ))}
                </FilterSelectContent>
              </Select>
            </>
          )}
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span id={multiSelectId}>多选</span>
            <Switch
              size="sm"
              checked={multiSelect}
              onCheckedChange={setMultiSelect}
              aria-labelledby={multiSelectId}
            />
          </span>
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
          className="min-h-0 flex-1 overflow-auto outline-none select-none"
          tabIndex={0}
          role="listbox"
          aria-label="文件"
          onPointerDown={beginMarquee}
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
                location.itemId || location.taskId
                  ? "任务提交文件后会出现在这里。"
                  : location.projectId
                    ? location.view === "task"
                      ? "项目里有任务后会出现在这里。"
                      : "创建项目后会出现在这里。"
                    : location.typeId
                      ? "创建企划后会出现在这里。"
                      : "添加企划类型后会出现在这里。"
              }
            />
          ) : view === "icons" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2 p-3">
              {entries.map((entry) => (
                <IconEntry
                  key={entry.id}
                  entry={entry}
                  selected={selectedIds.includes(entry.id)}
                  onSelect={(event) => selectEntry(entry.id, event)}
                  onOpen={() => openEntry(entry)}
                  onContextMenu={(event) => openContextMenu(entry, event)}
                />
              ))}
            </div>
          ) : (
            <DetailsTable
              entries={entries}
              selectedIds={selectedIds}
              onSelect={selectEntry}
              onOpen={openEntry}
              onContextMenu={openContextMenu}
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
          <span>
            {downloading && downloadProgress
              ? `正在下载 ${downloadProgress.done}/${downloadProgress.total}`
              : discardMutation.isPending
                ? "正在删除远程文件"
                : `共 ${total} 项`}
          </span>
          <span className="truncate">
            {selectedEntries.length > 1
              ? `已选 ${selectedEntries.length} 项`
              : selected?.kind === "FILE"
                ? [
                    selected.taskName ?? "任务",
                    selected.fieldLabel ?? "文件",
                    versionText(selected.versionNo),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : (selected?.name ?? "")}
          </span>
        </div>
      </section>
      {menu && (
        <FileActionMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <MenuAction
            icon={Eye}
            label="预览"
            disabled={!canPreview}
            onClick={() => {
              if (!menuEntry || !canPreview) return;
              setMenu(null);
              preview(menuEntry);
            }}
          />
          <MenuAction
            icon={Download}
            label={
              downloadProgress ? `下载 ${downloadProgress.done}/${downloadProgress.total}` : "下载"
            }
            disabled={!canDownload}
            onClick={() => {
              setMenu(null);
              chooseDownloadView();
            }}
          />
          <MenuAction
            icon={Trash2}
            label="删除远程文件"
            disabled={!canDiscardRemote}
            onClick={() => {
              setMenu(null);
              void discardSelected();
            }}
          />
        </FileActionMenu>
      )}
      <Dialog
        open={downloadRequest !== null}
        onOpenChange={(open) => {
          if (!open) setDownloadRequest(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择下载视图</DialogTitle>
          </DialogHeader>
          <Select
            value={downloadView}
            onValueChange={(value) => {
              if (value === "item" || value === "task") setDownloadView(value);
            }}
          >
            <SelectTrigger aria-label="下载视图" className="w-full">
              <SelectValue>{LEAF_LABEL[downloadView]}视图</SelectValue>
            </SelectTrigger>
            <FilterSelectContent>
              <SelectItem value="item">项目视图</SelectItem>
              <SelectItem value="task">任务视图</SelectItem>
            </FilterSelectContent>
          </Select>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
            <Button onClick={() => void downloadSelected()}>开始下载</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div
        ref={marqueeRef}
        hidden
        className="pointer-events-none fixed z-50 border border-foreground/40 bg-foreground/10"
      />
    </div>
  );
}

function versionText(versionNo?: number | null): string {
  return versionNo == null ? "" : `版本 ${versionNo}`;
}

function IconEntry({
  entry,
  selected,
  onSelect,
  onOpen,
  onContextMenu,
}: {
  entry: OrgFileEntryVO;
  selected: boolean;
  onSelect: (event: MouseEvent) => void;
  onOpen: () => void;
  onContextMenu: (event: MouseEvent) => void;
}): ReactElement {
  const Icon = fileIcon(entry);
  return (
    <button
      type="button"
      role="option"
      data-entry-id={entry.id}
      aria-selected={selected}
      title={entry.name}
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 rounded-lg px-2 py-2 text-center",
        selected
          ? "bg-foreground/15 text-foreground ring-1 ring-foreground/30 ring-inset"
          : "hover:bg-foreground/10",
        entry.availability === "unavailable" && "opacity-60",
      )}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <Icon
        className={cn(
          "size-8",
          entry.kind === "FOLDER" ? "text-foreground" : "text-muted-foreground",
        )}
      />
      <span className="line-clamp-2 w-full break-all text-xs">{entry.name}</span>
      {entry.subtitle && (
        <span className="line-clamp-1 w-full text-[11px] text-muted-foreground">
          {entry.subtitle}
        </span>
      )}
      {entry.kind === "FILE" && (
        <span className="line-clamp-1 w-full text-[11px] text-muted-foreground">
          {[entry.taskName, versionText(entry.versionNo)].filter(Boolean).join(" · ")}
        </span>
      )}
    </button>
  );
}

function DetailsTable({
  entries,
  selectedIds,
  onSelect,
  onOpen,
  onContextMenu,
}: {
  entries: OrgFileEntryVO[];
  selectedIds: string[];
  onSelect: (id: string, event: MouseEvent) => void;
  onOpen: (entry: OrgFileEntryVO) => void;
  onContextMenu: (entry: OrgFileEntryVO, event: MouseEvent) => void;
}): ReactElement {
  return (
    <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
      <thead className="text-muted-foreground sticky top-0 bg-card text-left text-xs">
        <tr>
          <th className="border-border border-b px-3 py-2 font-medium">名称</th>
          <th className="border-border border-b px-3 py-2 font-medium">任务</th>
          <th className="border-border border-b px-3 py-2 font-medium">版本</th>
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
              data-entry-id={entry.id}
              aria-selected={selected}
              className={cn(
                "cursor-default",
                selected ? "bg-foreground/15" : "hover:bg-foreground/10",
              )}
              onClick={(event) => onSelect(entry.id, event)}
              onDoubleClick={() => onOpen(entry)}
              onContextMenu={(event) => onContextMenu(entry, event)}
            >
              <td className="max-w-64 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate" title={entry.name}>
                    {entry.name}
                  </span>
                </span>
              </td>
              <td className="text-muted-foreground max-w-40 truncate px-3 py-2">
                {entry.kind === "FILE"
                  ? [entry.subtitle, entry.taskName].filter(Boolean).join(" · ")
                  : (entry.subtitle ?? "文件夹")}
              </td>
              <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                {entry.kind === "FILE" ? versionText(entry.versionNo) : "—"}
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
