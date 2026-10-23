import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { switchOrganization } from "@/api/user";
import { externalEntryPath, parseExternalEntry } from "@/lib/externalEntry";
import { getCurrentOrgId, getToken, saveCurrentOrganization } from "@/lib/session";

export default function ExternalEntryPage(): ReactElement {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const search = params.toString();

  useEffect(() => {
    const entry = parseExternalEntry(search);
    if (!entry) {
      setError("无法打开这个链接");
      return;
    }
    if (!getToken()) {
      void navigate(`/login?next=${encodeURIComponent(`/go?${search}`)}`, { replace: true });
      return;
    }
    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        if (getCurrentOrgId() !== entry.orgId) {
          const organization = await switchOrganization({ orgId: entry.orgId });
          if (cancelled) return;
          saveCurrentOrganization(organization.id, organization.role);
        }
        if (!cancelled) void navigate(externalEntryPath(entry), { replace: true });
      } catch {
        if (!cancelled) setError("无法打开这个链接");
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [navigate, search]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 text-sm text-muted-foreground">
      <p>{error || "正在打开…"}</p>
    </main>
  );
}
