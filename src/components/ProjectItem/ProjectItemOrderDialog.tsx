import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactElement } from "react";
import { ArrowDown, ArrowUp, GripVertical, Loader2, RotateCcw } from "lucide-react";

import { getProjectItemOrder, reorderProjectItems } from "@/api/projectItem";
import { $tip } from "@/components/tip";
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
import { useApiMutation, useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";
import type { ProjectItemOrderEntryVO, ProjectItemReorderDTO } from "@/types/projectItem";

interface ProjectItemOrderDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface DropTarget {
  id: string;
  edge: "before" | "after";
}

const ITEM_DRAG_TYPE = "application/x-longlian-item-id";

export default function ProjectItemOrderDialog({
  projectId,
  open,
  onOpenChange,
  onSaved,
}: ProjectItemOrderDialogProps): ReactElement {
  const confirm = useConfirm();
  const session = useSessionSnapshot();
  const [baseline, setBaseline] = useState<string[]>([]);
  const [draft, setDraft] = useState<ProjectItemOrderEntryVO[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [destination, setDestination] = useState("");
  const [positionError, setPositionError] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const draggingId = useRef<string | null>(null);
  const actionLock = useRef(false);
  const saveSucceeded = useRef(false);
  const confirming = useRef(false);
  const mounted = useRef(true);
  const loadRequest = useRef(0);
  const lifecycle = useRef({
    projectId,
    open,
    appScope: session.appScope,
    orgId: session.orgId,
    generation: 0,
  });
  if (
    lifecycle.current.projectId !== projectId ||
    lifecycle.current.open !== open ||
    lifecycle.current.appScope !== session.appScope ||
    lifecycle.current.orgId !== session.orgId
  ) {
    lifecycle.current = {
      projectId,
      open,
      appScope: session.appScope,
      orgId: session.orgId,
      generation: lifecycle.current.generation + 1,
    };
  }
  const isCurrent = useCallback(
    (generation: number): boolean => mounted.current && lifecycle.current.generation === generation,
    [],
  );

  // 每次打开显式取新基线；后台缓存更新不能改写正在编辑的草稿。
  const { refetch } = useApiQuery({
    key: ["items", "order", projectId],
    queryFn: () => getProjectItemOrder(projectId),
    enabled: false,
    staleTime: 0,
  });
  const mutation = useApiMutation({
    mutationFn: (dto: ProjectItemReorderDTO) => reorderProjectItems(projectId, dto),
    invalidate: [["items"]],
  });
  const loadOrder = useCallback(async (): Promise<void> => {
    const generation = lifecycle.current.generation;
    const request = ++loadRequest.current;
    setLoadState("loading");
    setSaveFailed(false);
    const result = await refetch();
    if (!isCurrent(generation) || request !== loadRequest.current) return;
    if (result.isError || !result.data) {
      setLoadState("error");
      return;
    }
    setBaseline(result.data.map((item) => item.id));
    setDraft(result.data);
    setSelectedId(result.data[0]?.id ?? "");
    setDestination(result.data.length ? "1" : "");
    setPositionError("");
    setLoadState("ready");
  }, [refetch, isCurrent]);

  useEffect((): (() => void) => {
    mounted.current = true;
    return (): void => {
      mounted.current = false;
    };
  }, []);
  useEffect((): void => {
    if (!open) return;
    saveSucceeded.current = false;
    setSaved(false);
    setDropTarget(null);
    draggingId.current = null;
    void loadOrder();
  }, [open, projectId, session.appScope, session.orgId, loadOrder]);

  const dirty =
    baseline.length !== draft.length || baseline.some((id, index) => draft[index]?.id !== id);
  const busy = !open || loadState !== "ready" || mutation.isPending || saved;
  const selected = draft.find((item) => item.id === selectedId);

  async function discardConfirmed(): Promise<boolean> {
    if (!dirty) return true;
    if (confirming.current) return false;
    confirming.current = true;
    try {
      return await confirm({
        title: "放弃顺序调整？",
        description: "尚未保存的顺序将丢失。",
        confirmText: "放弃调整",
      });
    } finally {
      confirming.current = false;
    }
  }

  async function requestClose(): Promise<void> {
    if (actionLock.current || mutation.isPending || confirming.current) return;
    const generation = lifecycle.current.generation;
    if ((await discardConfirmed()) && isCurrent(generation)) onOpenChange(false);
  }

  async function reloadOrder(): Promise<void> {
    if (actionLock.current || mutation.isPending || confirming.current) return;
    const generation = lifecycle.current.generation;
    if ((await discardConfirmed()) && isCurrent(generation)) await loadOrder();
  }

  function selectItem(id: string): void {
    if (busy) return;
    setSelectedId(id);
    setDestination(String(draft.findIndex((item) => item.id === id) + 1));
    setPositionError("");
  }

  function moveTo(id: string, position: number): void {
    if (busy || position < 0 || position >= draft.length) return;
    const from = draft.findIndex((item) => item.id === id);
    const item = draft[from];
    if (!item) return;
    const next = [...draft];
    next.splice(from, 1);
    next.splice(position, 0, item);
    setDraft(next);
    setSelectedId(id);
    setDestination(String(position + 1));
    setPositionError("");
  }

  function moveToDestination(): void {
    const position = Number(destination);
    if (!Number.isInteger(position) || position < 1 || position > draft.length) {
      setPositionError(`请输入 1 到 ${draft.length} 的整数`);
      return;
    }
    moveTo(selectedId, position - 1);
  }

  function dragStart(event: DragEvent<HTMLButtonElement>, id: string): void {
    if (busy) {
      event.preventDefault();
      return;
    }
    draggingId.current = id;
    event.dataTransfer.setData(ITEM_DRAG_TYPE, id);
    event.dataTransfer.effectAllowed = "move";
    selectItem(id);
  }

  function dragOver(event: DragEvent<HTMLLIElement>, id: string): void {
    if (busy || !draggingId.current || !event.dataTransfer.types.includes(ITEM_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropTarget({
      id,
      edge: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after",
    });
  }

  function drop(event: DragEvent<HTMLLIElement>, targetId: string): void {
    event.preventDefault();
    const id = event.dataTransfer.getData(ITEM_DRAG_TYPE);
    const bounds = event.currentTarget.getBoundingClientRect();
    const after = event.clientY >= bounds.top + bounds.height / 2;
    if (!busy && id === draggingId.current && id !== targetId) {
      const remaining = draft.filter((item) => item.id !== id);
      const targetIndex = remaining.findIndex((item) => item.id === targetId);
      if (targetIndex >= 0) moveTo(id, targetIndex + (after ? 1 : 0));
    }
    draggingId.current = null;
    setDropTarget(null);
  }

  async function saveOrder(): Promise<void> {
    if (busy || !dirty || actionLock.current || saveSucceeded.current) return;
    actionLock.current = true;
    const generation = lifecycle.current.generation;
    try {
      await mutation.mutateAsync({
        expectedItemIds: baseline,
        itemIds: draft.map((item) => item.id),
      });
      if (!isCurrent(generation)) return;
      saveSucceeded.current = true;
      setSaved(true);
      $tip("顺序已保存", "success");
      onSaved();
    } catch {
      if (isCurrent(generation)) setSaveFailed(true);
      // 共享请求入口展示错误，保留草稿供重试或主动重新加载。
    } finally {
      actionLock.current = false;
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void requestClose();
      }}
    >
      <DialogContent className="sm:max-w-xl" showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle>调整顺序</DialogTitle>
          <DialogDescription>对全部项目排序，进行中和已完成共用同一顺序。</DialogDescription>
        </DialogHeader>
        {loadState === "loading" ? (
          <div
            className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" />
            正在加载项目…
          </div>
        ) : loadState === "error" ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3">
            <p role="alert">项目顺序加载失败</p>
            <Button variant="outline" onClick={() => void reloadOrder()}>
              重新加载
            </Button>
          </div>
        ) : draft.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">暂无项目</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
              <p className="min-w-0 break-words text-sm">已选择：{selected?.title}</p>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="project-item-position"
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  移到第
                </label>
                <Input
                  id="project-item-position"
                  type="number"
                  min={1}
                  max={draft.length}
                  step={1}
                  className="h-8 w-20"
                  value={destination}
                  disabled={busy}
                  aria-invalid={Boolean(positionError)}
                  aria-describedby={positionError ? "project-item-position-error" : undefined}
                  onChange={(event) => {
                    setDestination(event.target.value);
                    setPositionError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      moveToDestination();
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">位</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || draft.length < 2}
                  onClick={moveToDestination}
                >
                  移动
                </Button>
              </div>
            </div>
            {positionError && (
              <p id="project-item-position-error" role="alert" className="text-xs text-destructive">
                {positionError}
              </p>
            )}
            <ol
              aria-label="项目排序列表"
              className="max-h-[min(55vh,28rem)] space-y-1 overflow-y-auto overscroll-contain pr-1"
            >
              {draft.map((item, index) => (
                <li
                  key={item.id}
                  data-item-id={item.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-transparent px-2 py-2",
                    selectedId === item.id
                      ? "bg-accent/60 ring-1 ring-inset ring-border"
                      : "hover:bg-muted/40",
                    dropTarget?.id === item.id &&
                      dropTarget.edge === "before" &&
                      "border-t-2 border-t-primary",
                    dropTarget?.id === item.id &&
                      dropTarget.edge === "after" &&
                      "border-b-2 border-b-primary",
                  )}
                  onDragOver={(event) => dragOver(event, item.id)}
                  onDrop={(event) => drop(event, item.id)}
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
                    draggable={!busy}
                    disabled={busy}
                    aria-label={`拖动项目：${item.title}`}
                    onDragStart={(event) => dragStart(event, item.id)}
                    onDragEnd={() => {
                      draggingId.current = null;
                      setDropTarget(null);
                    }}
                  >
                    <GripVertical className="size-4" />
                  </Button>
                  <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    aria-pressed={selectedId === item.id}
                    disabled={busy}
                    className="min-w-0 flex-1 rounded-sm px-1 py-1 text-left break-words outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => selectItem(item.id)}
                  >
                    {item.title}
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`上移项目：${item.title}`}
                      disabled={busy || index === 0}
                      onClick={() => moveTo(item.id, index - 1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`下移项目：${item.title}`}
                      disabled={busy || index === draft.length - 1}
                      onClick={() => moveTo(item.id, index + 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">
              共 {draft.length} 个项目 · 拖动手柄或使用上下按钮调整，保存后生效。
            </p>
          </>
        )}
        {saveFailed && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 p-3">
            <p role="alert" className="text-xs text-destructive">
              未能确认保存结果。可重试，或重新加载最新顺序。
            </p>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void reloadOrder()}>
              <RotateCcw className="size-3.5" />
              重新加载
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={mutation.isPending || saved}
            onClick={() => void requestClose()}
          >
            取消
          </Button>
          <Button disabled={busy || !dirty || draft.length < 2} onClick={() => void saveOrder()}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {mutation.isPending ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
