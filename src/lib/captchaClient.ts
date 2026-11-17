export interface FCaptchaSession {
  execute(action?: string): Promise<{ success: boolean; token?: string }>;
  destroy(): void;
}

export interface FCaptchaClient {
  invisible(options: {
    siteKey: string;
    serverUrl: string;
    minCollectionTime?: number;
    autoScore?: boolean;
  }): FCaptchaSession;
  execute(
    siteKey: string,
    options: { action: string; minTime?: number },
  ): Promise<{ success: boolean; token?: string }>;
  configure(options: { serverUrl: string }): void;
  serverUrl: string;
  languages(): string[];
}

declare global {
  interface Window {
    FCaptcha?: FCaptchaClient;
  }
}

let loader: Promise<FCaptchaClient> | null = null;

/** 后端返回的地址来自自建服务；禁止任何不加载脚本就跳过验证的全局开关。 */
export function loadCaptchaClient(
  scriptSrc: string,
  onFailed?: (error: unknown) => void,
): Promise<FCaptchaClient> {
  if (window.FCaptcha) return Promise.resolve(window.FCaptcha);
  loader ??= new Promise<FCaptchaClient>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => {
      if (window.FCaptcha) {
        resolve(window.FCaptcha);
      } else {
        reject(new Error("FCaptcha missing"));
      }
    };
    script.onerror = (event) => {
      const detail = typeof event === "string" ? event : "网络或脚本加载失败";
      reject(new Error(`FCaptcha script failed: ${detail}`));
    };
    document.head.appendChild(script);
  });
  return loader.catch((error: unknown) => {
    loader = null;
    onFailed?.(error);
    throw error;
  });
}

export function resetCaptchaClientForTest(): void {
  loader = null;
}
