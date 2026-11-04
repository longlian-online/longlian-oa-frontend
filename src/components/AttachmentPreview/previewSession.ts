export interface AttachmentPreviewRequest {
  owner: symbol;
  fileName: string;
  fileSize?: number;
  file?: File;
  resolveUrl?: (signal: AbortSignal) => Promise<string>;
}

type PreviewListener = (request: AttachmentPreviewRequest) => void;
type PreviewCloser = (owner?: symbol) => void;

let listener: PreviewListener | null = null;
let closer: PreviewCloser | null = null;

export function registerAttachmentPreview(
  nextListener: PreviewListener,
  nextCloser: PreviewCloser,
): () => void {
  listener = nextListener;
  closer = nextCloser;
  return () => {
    if (listener === nextListener) listener = null;
    if (closer === nextCloser) closer = null;
  };
}

export function openAttachmentPreview(request: AttachmentPreviewRequest): void {
  listener?.(request);
}

export function closeAttachmentPreview(owner?: symbol): void {
  closer?.(owner);
}
