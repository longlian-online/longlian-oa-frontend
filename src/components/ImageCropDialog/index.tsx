import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, MediaSize, Point, Size } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { $tip } from "@/components/tip";
import { cn } from "@/lib/utils";
import { cropImageFile } from "@/lib/imageCrop";

function describeCrop(file: File, allowOriginal: boolean): string {
  const gif = file.name.toLowerCase().endsWith(".gif");
  if (!allowOriginal) {
    return gif ? "GIF 裁剪后将保存为静态图片。请截取方形区域。" : "请截取方形区域后再上传。";
  }
  return gif ? "GIF 裁剪后为静态图片。也可以直接上传原图。" : "也可以直接上传原图。";
}

interface ImageCropDialogProps {
  file: File;
  aspect?: number;
  shape?: "rect" | "round";
  allowOriginal?: boolean;
  onComplete: (file: File | null) => void;
}

export default function ImageCropDialog({
  file,
  aspect,
  shape,
  allowOriginal = true,
  onComplete,
}: ImageCropDialogProps): React.JSX.Element {
  const [url, setUrl] = useState("");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageAspect, setImageAspect] = useState(1);
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [cropSize, setCropSize] = useState<Size | null>(null);
  const [processing, setProcessing] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const minZoom =
    cropSize && mediaSize
      ? Math.max(cropSize.width / mediaSize.width, cropSize.height / mediaSize.height)
      : 1;
  useEffect(() => {
    setZoom((current) => Math.max(current, minZoom));
  }, [minZoom]);

  const handleConfirm = async (): Promise<void> => {
    if (!area || !cropSize || !imageRef.current?.width || processing) return;
    setProcessing(true);
    try {
      onComplete(await cropImageFile(file, imageRef.current, area));
    } catch (error) {
      $tip(error instanceof Error ? error.message : "图片裁剪失败", "error");
      setProcessing(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !processing) onComplete(null);
      }}
    >
      <DialogContent
        className="sm:max-w-2xl data-open:zoom-in-100 data-closed:zoom-out-100"
        showCloseButton={!processing}
      >
        <DialogHeader>
          <DialogTitle>裁剪图片</DialogTitle>
          <DialogDescription>{describeCrop(file, allowOriginal)}</DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "relative mx-auto w-fit max-w-full overflow-hidden rounded-lg",
            processing && "pointer-events-none",
          )}
        >
          {failed ? (
            <p role="alert" className="p-4 text-muted-foreground">
              图片无法预览，请重新选择或上传原图。
            </p>
          ) : url ? (
            <>
              <img
                src={url}
                alt=""
                aria-hidden
                className="invisible block max-h-[min(50vh,360px)] max-w-full"
                onError={() => setFailed(true)}
              />
              <Cropper
                image={url}
                crop={crop}
                zoom={Math.max(zoom, minZoom)}
                maxZoom={Math.max(3, minZoom)}
                aspect={aspect ?? imageAspect}
                cropShape={shape ?? (aspect === 1 ? "round" : "rect")}
                objectFit="contain"
                minZoom={minZoom}
                restrictPosition
                onCropSizeChange={setCropSize}
                onMediaLoaded={(media) => {
                  setMediaSize(media);
                  setImageAspect(media.naturalWidth / media.naturalHeight);
                }}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropAreaChange={(_, pixels) => setArea(pixels)}
                setImageRef={(ref) => {
                  imageRef.current = ref.current;
                }}
                mediaProps={{ onError: () => setFailed(true) }}
                onTouchRequest={() => !processing}
                onWheelRequest={() => !processing}
              />
            </>
          ) : (
            <p className="p-4 text-muted-foreground">正在加载图片…</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="image-crop-zoom" className="shrink-0 text-sm text-muted-foreground">
            缩放
          </label>
          <input
            id="image-crop-zoom"
            type="range"
            min={minZoom}
            max={Math.max(3, minZoom)}
            step={0.01}
            value={zoom}
            disabled={processing || failed}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-5 min-w-0 flex-1 cursor-pointer accent-primary disabled:cursor-default"
          />
          <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={processing}
            onClick={() => onComplete(null)}
          >
            取消
          </Button>
          {allowOriginal && (
            <Button
              type="button"
              variant="outline"
              disabled={processing}
              onClick={() => onComplete(file)}
            >
              上传原图
            </Button>
          )}
          <Button
            type="button"
            disabled={processing || failed || !area?.width || !area?.height}
            onClick={() => void handleConfirm()}
          >
            {processing ? "正在处理…" : "确认裁剪并上传"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
