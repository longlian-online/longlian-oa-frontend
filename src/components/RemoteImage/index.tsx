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

const VOLATILE_SIGN_PARAMS = new Set([
  "token",
  "t",
  "sign",
  "signature",
  "expires",
  "x-oss-expires",
  "x-oss-signature",
  "x-amz-signature",
  "x-amz-date",
  "x-amz-credential",
  "x-amz-security-token",
]);

const RESOLVED_SRC_CACHE_LIMIT = 500;
const resolvedSrcByKey = new Map<string, string>();

/**
 * 提取剥离临时签名参数后的稳定图片键，保留路径与尺寸/格式处理参数。
 * 用于在同一资源刷新签名 URL 时复用已解码画面与浏览器缓存。
 */
export function normalizeImageResourceKey(src: string): string {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;
  try {
    const parsed = new URL(src, "http://remote-image.invalid");
    const stableEntries: Array<[string, string]> = [];
    parsed.searchParams.forEach((value, key) => {
      if (!VOLATILE_SIGN_PARAMS.has(key.toLowerCase())) {
        stableEntries.push([key, value]);
      }
    });
    stableEntries.sort(([aKey, aVal], [bKey, bVal]) =>
      aKey === bKey ? aVal.localeCompare(bVal) : aKey.localeCompare(bKey),
    );
    const stableQuery = new URLSearchParams(stableEntries).toString();
    const originPrefix = parsed.origin === "http://remote-image.invalid" ? "" : parsed.origin;
    return `${originPrefix}${parsed.pathname}${stableQuery ? `?${stableQuery}` : ""}`;
  } catch {
    return src;
  }
}

function rememberResolvedSrc(resourceKey: string, src: string): void {
  if (!resourceKey || resourceKey.startsWith("blob:") || resourceKey.startsWith("data:")) return;
  if (resolvedSrcByKey.has(resourceKey)) {
    resolvedSrcByKey.delete(resourceKey);
  } else if (resolvedSrcByKey.size >= RESOLVED_SRC_CACHE_LIMIT) {
    const oldestKey = resolvedSrcByKey.keys().next().value;
    if (oldestKey !== undefined) resolvedSrcByKey.delete(oldestKey);
  }
  resolvedSrcByKey.set(resourceKey, src);
}

export function clearRemoteImageCache(): void {
  resolvedSrcByKey.clear();
}

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

interface ImagePhase {
  resourceKey: string;
  activeSrc: string;
  status: RemoteImageStatus;
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
  const resourceKey = normalizeImageResourceKey(src);
  const cachedSrc = resolvedSrcByKey.get(resourceKey);
  const imgRef = useRef<HTMLImageElement>(null);
  const generation = useRef(0);
  const resourceKeyRef = useRef(resourceKey);
  const activeSrcRef = useRef(cachedSrc ?? src);
  const statusRef = useRef<RemoteImageStatus>("loading");
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  const [phase, setPhase] = useState<ImagePhase>(() => ({
    resourceKey,
    activeSrc: cachedSrc ?? src,
    status: "loading",
  }));

  onLoadRef.current = onLoad;
  onErrorRef.current = onError;

  let activeSrc = phase.activeSrc;
  let status = phase.status;

  if (phase.resourceKey !== resourceKey) {
    // 切换到了不同图片资源，重置为占位并优先尝试缓存地址。
    activeSrc = cachedSrc ?? src;
    status = "loading";
  } else if (phase.status === "error" && phase.activeSrc !== src) {
    // 同一资源之前加载失败（如旧签名过期），收到新签名地址时自动重试。
    activeSrc = src;
    status = "loading";
  }

  if (resourceKeyRef.current !== resourceKey || activeSrcRef.current !== activeSrc) {
    resourceKeyRef.current = resourceKey;
    activeSrcRef.current = activeSrc;
    statusRef.current = status;
    generation.current += 1;
  }

  function commit(
    next: RemoteImageStatus,
    token: number,
    requestedKey: string,
    requestedSrc: string,
  ): void {
    if (
      token !== generation.current ||
      requestedKey !== resourceKeyRef.current ||
      requestedSrc !== activeSrcRef.current
    ) {
      return;
    }
    if (statusRef.current === next) return;
    if (next === "ready") {
      rememberResolvedSrc(requestedKey, requestedSrc);
    } else if (resolvedSrcByKey.get(requestedKey) === requestedSrc) {
      resolvedSrcByKey.delete(requestedKey);
    }
    statusRef.current = next;
    setPhase({ resourceKey: requestedKey, activeSrc: requestedSrc, status: next });
    if (next === "ready") onLoadRef.current?.();
    else onErrorRef.current?.();
  }

  function handleError(token: number, requestedKey: string, requestedSrc: string): void {
    if (
      token !== generation.current ||
      requestedKey !== resourceKeyRef.current ||
      requestedSrc !== activeSrcRef.current
    ) {
      return;
    }
    // 若当前使用的是旧缓存签名且与最新 props.src 不同，先回退到最新地址重试。
    if (requestedSrc !== src && normalizeImageResourceKey(src) === requestedKey) {
      if (resolvedSrcByKey.get(requestedKey) === requestedSrc) {
        resolvedSrcByKey.delete(requestedKey);
      }
      activeSrcRef.current = src;
      statusRef.current = "loading";
      generation.current += 1;
      setPhase({ resourceKey: requestedKey, activeSrc: src, status: "loading" });
      return;
    }
    commit("error", token, requestedKey, requestedSrc);
  }

  function settle(
    img: HTMLImageElement,
    token: number,
    requestedKey: string,
    requestedSrc: string,
    syncIfComplete: boolean,
  ): void {
    if (
      token !== generation.current ||
      requestedKey !== resourceKeyRef.current ||
      requestedSrc !== activeSrcRef.current
    ) {
      return;
    }
    if (img.naturalWidth === 0) {
      handleError(token, requestedKey, requestedSrc);
      return;
    }
    if (syncIfComplete) {
      commit("ready", token, requestedKey, requestedSrc);
      return;
    }
    const decode = typeof img.decode === "function" ? img.decode.bind(img) : null;
    void Promise.resolve(decode ? decode() : undefined).then(
      () => {
        if (statusRef.current === "error") return;
        commit("ready", token, requestedKey, requestedSrc);
      },
      () => handleError(token, requestedKey, requestedSrc),
    );
  }

  useLayoutEffect(() => {
    const img = imgRef.current;
    // 浏览器内存/磁盘已命中的图片在绘制前同步切为 ready，避免闪灰和重复淡入。
    if (img?.complete) settle(img, generation.current, resourceKey, activeSrc, true);
  }, [resourceKey, activeSrc]);

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
          key={resourceKey}
          ref={imgRef}
          src={activeSrc}
          alt={alt}
          decoding={imgProps.decoding ?? "async"}
          className={cn(
            "absolute inset-0 size-full transition-[opacity,transform] duration-300 motion-reduce:transition-none",
            fit === "contain" ? "object-contain" : "object-cover",
            status === "ready" ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
          onLoad={(event) =>
            settle(event.currentTarget, generation.current, resourceKey, activeSrc, false)
          }
          onError={() => handleError(generation.current, resourceKey, activeSrc)}
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
