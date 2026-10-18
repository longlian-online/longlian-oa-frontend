import {
  useLayoutEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type RemoteImageStatus = "loading" | "ready" | "error";

export interface RemoteImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "className" | "onLoad" | "onError"
> {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  fit?: "cover" | "contain";
  fallback?: ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export default function RemoteImage({
  src,
  alt,
  className,
  imgClassName,
  fit = "cover",
  fallback = null,
  onLoad,
  onError,
  ...imgProps
}: RemoteImageProps): ReactElement {
  const imgRef = useRef<HTMLImageElement>(null);
  const generation = useRef(0);
  const srcRef = useRef(src);
  const statusRef = useRef<RemoteImageStatus>("loading");
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  const [phase, setPhase] = useState<{ src: string; status: RemoteImageStatus }>({
    src,
    status: "loading",
  });

  onLoadRef.current = onLoad;
  onErrorRef.current = onError;
  if (srcRef.current !== src) {
    srcRef.current = src;
    statusRef.current = "loading";
    generation.current += 1;
  }

  const status = phase.src === src ? phase.status : "loading";

  function commit(next: RemoteImageStatus, token: number, requestedSrc: string): void {
    if (token !== generation.current || requestedSrc !== srcRef.current) return;
    if (statusRef.current === next) return;
    statusRef.current = next;
    setPhase({ src: requestedSrc, status: next });
    if (next === "ready") onLoadRef.current?.();
    else onErrorRef.current?.();
  }

  function settle(img: HTMLImageElement, token: number, requestedSrc: string): void {
    if (token !== generation.current || requestedSrc !== srcRef.current) return;
    if (img.naturalWidth === 0) {
      commit("error", token, requestedSrc);
      return;
    }
    const decode = typeof img.decode === "function" ? img.decode.bind(img) : null;
    void Promise.resolve(decode ? decode() : undefined).then(
      () => {
        if (statusRef.current === "error") return;
        commit("ready", token, requestedSrc);
      },
      () => commit("error", token, requestedSrc),
    );
  }

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.complete) settle(img, generation.current, src);
  }, [src]);

  return (
    <span
      className={cn("relative block overflow-hidden bg-foreground/16", className)}
      data-slot="remote-image"
      data-state={status}
    >
      {status === "loading" && (
        <span
          aria-hidden
          data-slot="remote-image-placeholder"
          className="absolute inset-0 animate-pulse bg-foreground/30 motion-reduce:animate-none"
        />
      )}
      {status !== "error" && (
        <img
          {...imgProps}
          key={src}
          ref={imgRef}
          src={src}
          alt={alt}
          decoding="async"
          className={cn(
            "absolute inset-0 size-full transition-[opacity,transform] duration-300 motion-reduce:transition-none",
            fit === "contain" ? "object-contain" : "object-cover",
            status === "ready" ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
          onLoad={(event) => settle(event.currentTarget, generation.current, src)}
          onError={() => commit("error", generation.current, src)}
        />
      )}
      {status === "error" && fallback != null && (
        <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          {fallback}
        </span>
      )}
    </span>
  );
}
