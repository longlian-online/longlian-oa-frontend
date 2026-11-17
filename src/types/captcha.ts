import type { FCaptchaSession } from "@/lib/captchaClient";

export type CaptchaAction = "app_login_pwd" | "app_login_email" | "admin_login";

export interface CaptchaConfigVO {
  enabled: boolean;
  serverUrl?: string | null;
  siteKey?: string | null;
}

export type { FCaptchaSession };
