import { useRef, useState } from "react";
import { FileUp, ImagePlus, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUploadFile } from "@/hooks/useUploadFile";
import { cn } from "@/lib/utils";
import type { FileValidationOptions, UploadedFileInfo, UploadBizType } from "@/types/file";

interface FileUploadProps extends FileValidationOptions {
  bizType: UploadBizType;
  bizId: string;
  value?: UploadedFileInfo | null;
  title?: string;
  description?: string;
  imagePreview?: boolean;
  className?: string;
  onChange: (file: UploadedFileInfo | null) => void;
}

function getAcceptAttribute(accept?: string[]): string | undefined {
  return accept?.map((item) => (item.startsWith(".") ? item : `.${item}`)).join(",");
}

export default function FileUpload({
  bizType,
  bizId,
  value,
  title = "上传文件",
  description = "点击选择文件",
  imagePreview = false,
  accept,
  maxSize,
  className,
  onChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { uploading, uploadFile } = useUploadFile();
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = async (file: File): Promise<void> => {
    if (!file) return;

    try {
      const uploadedFile = await uploadFile(file, {
        bizType,
        bizId,
        accept,
        maxSize,
      });
      onChange(uploadedFile);
    } catch {
      // useUploadFile already shows the global error tip.
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await handleUpload(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLButtonElement>): Promise<void> => {
    event.preventDefault();
    setIsDragging(false);
    if (uploading) return;

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleUpload(file);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={getAcceptAttribute(accept)}
        onChange={handleFileChange}
      />

      {value && imagePreview && value.previewUrl ? (
        <div className="group relative overflow-hidden rounded-xl border bg-muted">
          <img
            src={value.previewUrl}
            alt={value.fileName}
            className="aspect-[2/3] w-full object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "group flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-input bg-muted/30 p-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03] disabled:pointer-events-none disabled:opacity-60",
            imagePreview ? "h-full min-h-[220px]" : "min-h-28",
            isDragging && "border-primary/60 bg-primary/[0.04]",
          )}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border transition-transform group-hover:scale-105">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : imagePreview ? (
              <ImagePlus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            ) : (
              <FileUp className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{uploading ? "上传中..." : title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </button>
      )}

      {value && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{value.fileName}</p>
            <p className="text-xs text-muted-foreground">fileId: {value.fileId}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
