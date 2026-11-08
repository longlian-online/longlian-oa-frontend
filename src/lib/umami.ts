const UMAMI_SCRIPT_SRC = "https://umami.longlian.online/script.js";
const WEBSITE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function umamiTrackingScript(websiteId: string | undefined): string | null {
  const id = websiteId?.trim() ?? "";
  if (id === "") return null;
  if (!WEBSITE_ID.test(id)) {
    throw new Error("VITE_UMAMI_WEBSITE_ID 不是合法的站点标识");
  }
  return `<script defer src="${UMAMI_SCRIPT_SRC}" data-website-id="${id}"></script>`;
}

export function injectUmamiScript(html: string, websiteId: string | undefined): string {
  const tag = umamiTrackingScript(websiteId);
  if (tag === null) return html;
  const at = html.indexOf("</head>");
  if (at < 0) throw new Error("index.html 缺少 </head>，无法注入 Umami");
  const lineStart = html.lastIndexOf("\n", at);
  const prefix = lineStart < 0 ? "" : html.slice(0, lineStart + 1);
  return `${prefix}    ${tag}\n  </head>${html.slice(at + "</head>".length)}`;
}
