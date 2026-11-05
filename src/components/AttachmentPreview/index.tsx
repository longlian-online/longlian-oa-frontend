import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import FileViewer from "@file-viewer/react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/hooks/useTheme";

import {
  PreviewReadError,
  previewRejectionMessage,
  readPreviewFile,
  rejectPreview,
} from "./previewable";
import { registerAttachmentPreview, type AttachmentPreviewRequest } from "./previewSession";
import { createPreviewOptions } from "./viewerOptions";

interface PreviewSession {
  owner: symbol;
  fileName: string;
  phase: "loading" | "ready" | "message";
  message?: string;
  file?: File;
}

export default function AttachmentPreviewHost(): ReactElement {
  const { theme } = useTheme();
  const [session, setSession] = useState<PreviewSession | null>(null);
  const tokenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const viewerTheme = theme === "dark" ? "dark" : "light";
  const options = useMemo(() => createPreviewOptions(viewerTheme), [viewerTheme]);

  useEffect(() => {
    return registerAttachmentPreview(
      (request) => {
        abortRef.current?.abort();
        const token = ++tokenRef.current;
        const rejection = rejectPreview(request.fileName, request.file?.size ?? request.fileSize);
        if (rejection) {
          setSession({
            owner: request.owner,
            fileName: request.fileName,
            phase: "message",
            message: previewRejectionMessage(rejection),
          });
          return;
        }
        if (request.file) {
          setSession({
            owner: request.owner,
            fileName: request.fileName,
            phase: "ready",
            file: request.file,
          });
          return;
        }
        const controller = new AbortController();
        abortRef.current = controller;
        setSession({ owner: request.owner, fileName: request.fileName, phase: "loading" });
        void loadRemotePreview(request, controller.signal).then(
          (file) => {
            if (tokenRef.current !== token) return;
            setSession({ owner: request.owner, fileName: request.fileName, phase: "ready", file });
          },
          (error: unknown) => {
            if (tokenRef.current !== token || controller.signal.aborted || isAbortError(error))
              return;
            setSession({
              owner: request.owner,
              fileName: request.fileName,
              phase: "message",
              message:
                error instanceof Error && error.message
                  ? error.message
                  : "无法读取文件，请稍后重试。",
            });
          },
        );
      },
      (owner) => {
        setSession((current) => {
          if (!current || (owner && current.owner !== owner)) return current;
          abortRef.current?.abort();
          tokenRef.current += 1;
          return null;
        });
      },
    );
  }, []);

  return (
    <Dialog
      open={session !== null}
      onOpenChange={(open) => {
        if (!open) {
          abortRef.current?.abort();
          tokenRef.current += 1;
          setSession(null);
        }
      }}
    >
      <DialogContent className="flex h-[min(40rem,calc(100vh-2rem))] w-[min(64rem,calc(100%-2rem))] max-w-none flex-col gap-3 overflow-hidden motion-reduce:animate-none motion-reduce:duration-0 sm:max-w-none">
        <DialogHeader className="pr-8">
          <DialogTitle className="truncate">{session?.fileName ?? "预览"}</DialogTitle>
          <DialogDescription className="sr-only">只读预览，不提供打印和导出。</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          {session?.phase === "ready" && session.file ? (
            <FileViewer
              key={`${session.file.name}:${session.file.size}:${viewerTheme}`}
              className="h-full"
              file={session.file}
              name={session.file.name}
              options={options}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {session?.phase === "loading" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  正在读取…
                </span>
              ) : (
                session?.message
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function loadRemotePreview(
  request: AttachmentPreviewRequest,
  signal: AbortSignal,
): Promise<File> {
  if (!request.resolveUrl) throw new PreviewReadError("无法读取文件，请稍后重试。");
  const url = await request.resolveUrl(signal);
  if (signal.aborted) throw new DOMException("已取消", "AbortError");
  return readPreviewFile(request.fileName, url, signal);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
