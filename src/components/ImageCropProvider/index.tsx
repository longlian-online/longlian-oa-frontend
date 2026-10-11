import { lazy, Suspense, useSyncExternalStore } from "react";
import { completeImageCrop, getImageCropRequest, subscribeImageCrop } from "@/lib/imageCropRequest";

const ImageCropDialog = lazy(() => import("@/components/ImageCropDialog"));

export default function ImageCropProvider(): React.JSX.Element | null {
  const request = useSyncExternalStore(subscribeImageCrop, getImageCropRequest, () => null);
  if (!request) return null;
  return (
    <Suspense fallback={null}>
      <ImageCropDialog
        key={request.id}
        file={request.file}
        aspect={request.aspect}
        onComplete={(file) => completeImageCrop(request.id, file)}
      />
    </Suspense>
  );
}
