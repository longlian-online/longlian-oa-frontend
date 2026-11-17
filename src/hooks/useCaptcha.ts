import { useCallback, useEffect, useRef, useState } from "react";

import { loadCaptchaClient } from "@/lib/captchaClient";
import type { CaptchaAction, CaptchaConfigVO, FCaptchaSession } from "@/types/captcha";

export type CaptchaReadiness =
  | { state: "disabled" }
  | { state: "loading" }
  | { state: "ready" }
  | { state: "failed"; retry: () => void };

export interface UseCaptchaOptions {
  readConfig: () => Promise<CaptchaConfigVO>;
  action: CaptchaAction;
}

/** 页面预热信号与挑战；票据仍由请求层在每次发送前获取。 */
export function useCaptcha({ readConfig, action }: UseCaptchaOptions): {
  readiness: CaptchaReadiness;
  begin: () => Promise<string | null>;
  running: boolean;
} {
  const [readiness, setReadiness] = useState<CaptchaReadiness>({ state: "loading" });
  const sessionRef = useRef<FCaptchaSession | null>(null);
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const actionRef = useRef(action);
  const readConfigRef = useRef(readConfig);

  useEffect(() => {
    actionRef.current = action;
    readConfigRef.current = readConfig;
  }, [action, readConfig]);

  useEffect(() => {
    let cancelled = false;
    const prepare = async (): Promise<void> => {
      setReadiness({ state: "loading" });
      try {
        const config = await readConfigRef.current();
        if (cancelled) return;
        if (!config.enabled) {
          setReadiness({ state: "disabled" });
          return;
        }
        if (!config.serverUrl || !config.siteKey) throw new Error("人机验证配置不可用");
        const client = await loadCaptchaClient(
          `${config.serverUrl.replace(/\/$/, "")}/fcaptcha.js`,
        );
        if (cancelled) return;
        if (!client) throw new Error("人机验证配置不可用");
        // invisible 会话自带 serverUrl，但全局相对路径请求仍可能打到页面源，保持一致。
        if (client.serverUrl !== config.serverUrl.replace(/\/$/, "")) {
          client.configure({ serverUrl: config.serverUrl.replace(/\/$/, "") });
        }
        sessionRef.current?.destroy();
        const session = client.invisible({
          siteKey: config.siteKey,
          serverUrl: config.serverUrl,
          autoScore: false,
        });
        sessionRef.current = session;
        setReadiness({ state: "ready" });
      } catch {
        if (!cancelled) setReadiness({ state: "failed", retry: () => void prepare() });
      }
    };
    void prepare();
    return (): void => {
      cancelled = true;
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  const begin = useCallback(async (): Promise<string | null> => {
    if (runningRef.current) return null;
    const target = sessionRef.current;
    if (!target) return null;
    runningRef.current = true;
    setRunning(true);
    try {
      const result = await target.execute(actionRef.current);
      return result.success && result.token ? result.token : null;
    } catch {
      return null;
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, []);

  return { readiness, begin, running };
}
