import type { CaptchaAction, CaptchaConfigVO } from "@/types/captcha";

interface CaptchaChallengeResult {
  success: boolean;
  token?: string;
}

interface FCaptchaClient {
  execute(siteKey: string, options: { action: CaptchaAction }): Promise<CaptchaChallengeResult>;
  configure(options: { serverUrl: string }): void;
  serverUrl: string;
}

declare global {
  interface Window {
    FCaptcha?: FCaptchaClient;
  }
}

let loader: Promise<FCaptchaClient> | null = null;

function loadCaptchaClient(scriptSrc: string): Promise<FCaptchaClient> {
  if (window.FCaptcha) return Promise.resolve(window.FCaptcha);
  loader ??= new Promise<FCaptchaClient>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => {
      if (window.FCaptcha) resolve(window.FCaptcha);
      else {
        script.remove();
        reject(new Error("FCaptcha missing"));
      }
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("FCaptcha script failed"));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loader = null;
    throw error;
  });
  return loader;
}

export async function obtainCaptchaToken(
  config: CaptchaConfigVO,
  action: CaptchaAction,
): Promise<string | null> {
  if (config?.enabled === false) return null;
  if (config?.enabled !== true || !config.serverUrl || !config.siteKey) {
    throw new Error("人机验证配置不可用");
  }

  const serverUrl = config.serverUrl.replace(/\/$/, "");
  let result: CaptchaChallengeResult;
  try {
    const client = await loadCaptchaClient(`${serverUrl}/fcaptcha.js`);
    // 跨源部署时，SDK 的相对路径必须指向 FCaptcha 而不是 SPA。
    if (client.serverUrl !== serverUrl) client.configure({ serverUrl });
    result = await client.execute(config.siteKey, { action });
  } catch (cause) {
    throw new Error("人机验证暂时不可用，请稍后重试", { cause });
  }
  if (!result.success || !result.token) throw new Error("人机验证未通过，请重试");
  return result.token;
}
