import { useEffect, useRef, useState, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowUp,
  ChevronLeft,
  Download,
  Eye,
  File,
  FileImage,
  FileText,
  Folder,
  LayoutGrid,
  List,
  Loader2,
} from "lucide-react";

import { ApiError } from "@/api/apiError";
import { getOrganizationFileDownload } from "@/api/organizationAdmin";
import {
  closeAttachmentPreview,
  openAttachmentPreview,
} from "@/components/AttachmentPreview/previewSession";
import CenteredLoading from "@/components/CenteredLoading";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { organizationFilesQuery } from "@/queries/organizationAdmin";
import type { OrgFileEntryVO } from "@/types/organizationAdmin";

import {
  orgFileLocation,
  orgFileSearch,
  parentOrgFileLocation,
  type OrgFileLocation,
} from "./fileLocation";

type ExplorerView = "icons" | "details";

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
  const listQuery = useApiQuery(organizationFilesQuery(location.projectId, location.itemId));
  const entries = listQuery.data?.entries ?? [];
  const [view, setView] = useState<ExplorerView>("icons");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const previewOwner = useRef(Symbol("org-file-preview"));
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const parent = parentOrgFileLocation(location);

  useEffect(() => {
    setSelectedId(null);
  }, [location.projectId, location.itemId]);

  useEffect(() => () => closeAttachmentPreview(previewOwner.current), []);

  function go(next: OrgFileLocation): void {
    const search = orgFileSearch(next);
    void navigate({ pathname: "/dashboard/org-admin/files", search: search ? `?${search}` : "" });
  }

  function openEntry(entry: OrgFileEntryVO): void {
    if (entry.kind === "FOLDER") {
      if (!location.projectId) {
        go({ projectId: entry.id });
        return;
      }
      if (!location.itemId) go({ projectId: location.projectId, itemId: entry.id });
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

  async function download(entry: OrgFileEntryVO): Promise<void> {
    if (!entry.taskInstanceId || !entry.fileId || entry.availability !== "available" || openingId)
      return;
    const tab = window.open("", "_blank");
    if (!tab) {
      $tip("浏览器阻止了附件窗口，请允许弹出窗口后重试", "error");
      return;
    }
    tab.opener = null;
    tab.document.title = "正在准备附件";
    setOpeningId(entry.id);
    try {
      const { readUrl } = await getOrganizationFileDownload(entry.taskInstanceId, entry.fileId);
      tab.location.replace(readUrl);
    } catch (error) {
      tab.close();
      if (error instanceof ApiError) {
        error.silence();
        $tip(error.message, "error");
      } else {
        $tip("附件打开失败，请稍后重试", "error");
      }
    } finally {
      setOpeningId(null);
    }
  }

  function moveSelection(offset: number): void {
    if (entries.length === 0) return;
    const index = entries.findIndex((entry) => entry.id === selectedId);
    const next = entries[(Math.max(index, 0) + offset + entries.length) % entries.length];
    if (next) setSelectedId(next.id);
  }

  const projectTitle = listQuery.data?.projectTitle || "企划";
  const itemTitle = listQuery.data?.itemTitle || "项目";
  const canOpenFile = selected?.kind === "FILE" && selected.availability === "available";
  const emptyText = location.itemId
    ? "这个项目还没有提交文件"
    : location.projectId
      ? "这个企划还没有项目"
      : "这个组织还没有企划";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">文件</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          企划、项目，以及任务当前有效的提交文件。
        </p>
      </div>
      <section className="border-border bg-card flex h-[calc(100svh-13.5rem)] min-h-96 flex-col overflow-hidden rounded-xl border">
        <div className="border-border flex flex-wrap items-center gap-1 border-b px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="后退"
            disabled={!parent}
            onClick={() => parent && go(parent)}
          >
            <ChevronLeft />
          </Button>
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
              onClick={() => go({})}
            >
              本组织
            </button>
            {location.projectId && (
              <>
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  className="max-w-48 truncate rounded px-1 hover:bg-secondary"
                  onClick={() => go({ projectId: location.projectId })}
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
            disabled={!canOpenFile || openingId !== null}
            onClick={() => selected && void download(selected)}
          >
            {openingId ? <Loader2 className="animate-spin" /> : <Download />}
            下载
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
          ) : entries.length === 0 ? (
            <EmptyState
              title={emptyText}
              description={
                location.itemId
                  ? "任务提交文件后会出现在这里。"
                  : location.projectId
                    ? "创建项目后会出现在这里。"
                    : "创建企划后会出现在这里。"
              }
            />
          ) : view === "icons" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2 p-3">
              {entries.map((entry) => (
                <IconEntry
                  key={entry.id}
                  entry={entry}
                  selected={entry.id === selectedId}
                  onSelect={() => setSelectedId(entry.id)}
                  onOpen={() => openEntry(entry)}
                />
              ))}
            </div>
          ) : (
            <DetailsTable
              entries={entries}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpen={openEntry}
            />
          )}
        </div>
        <div className="border-border text-muted-foreground flex items-center justify-between border-t px-3 py-1.5 text-xs">
          <span>
            {entries.filter((entry) => entry.kind === "FOLDER").length} 个文件夹，
            {entries.filter((entry) => entry.kind === "FILE").length} 个文件
          </span>
          <span className="truncate">
            {selected?.kind === "FILE"
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
  onSelect,
  onOpen,
}: {
  entry: OrgFileEntryVO;
  selected: boolean;
  onSelect: () => void;
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
  selectedId,
  onSelect,
  onOpen,
}: {
  entries: OrgFileEntryVO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
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
          const selected = entry.id === selectedId;
          return (
            <tr
              key={entry.id}
              role="option"
              aria-selected={selected}
              className={cn(
                "cursor-default",
                selected ? "bg-foreground/15" : "hover:bg-foreground/10",
              )}
              onClick={() => onSelect(entry.id)}
              onDoubleClick={() => onOpen(entry)}
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
                {entry.kind === "FILE" ? entry.taskName : "文件夹"}
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
