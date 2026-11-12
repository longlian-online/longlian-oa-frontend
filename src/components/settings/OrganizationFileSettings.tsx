import { useEffect, useState, type ReactElement } from "react";
import { FolderOpen } from "lucide-react";

import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { isOrganizationManagerRole } from "@/lib/organizationRole";
import {
  DirectoryAccessError,
  loadOrgDownloads,
  pickDownloadDirectory,
  saveOrgDirectory,
  type SavedDownloads,
} from "@/pages/dashboard/org-admin/downloadDirectory";
import { rememberDownloads } from "@/pages/dashboard/org-admin/downloadSession";
import { organizationsQuery } from "@/queries/session";

export default function OrganizationFileSettings(): ReactElement | null {
  const orgsQuery = useApiQuery(organizationsQuery);
  const orgs = (orgsQuery.data ?? []).filter((org) => isOrganizationManagerRole(org.role));
  const currentOrgId = useSessionSnapshot().orgId;
  const [chosen, setChosen] = useState<string | null>(null);
  const active =
    chosen && orgs.some((org) => org.id === chosen)
      ? chosen
      : (orgs.find((org) => org.id === currentOrgId)?.id ?? orgs[0]?.id ?? "");
  const [settings, setSettings] = useState<SavedDownloads | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void loadOrgDownloads(active).then((saved) => {
      if (!cancelled) setSettings(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (orgsQuery.isLoading && orgsQuery.data === undefined) return null;
  if (!orgsQuery.isError && orgs.length === 0) return null;

  const failed = orgsQuery.isError;

  async function chooseDirectory(): Promise<void> {
    if (!active || busy) return;
    setBusy(true);
    try {
      const handle = await pickDownloadDirectory();
      const saved = await saveOrgDirectory(active, handle);
      setSettings(saved);
      if (active === currentOrgId) rememberDownloads(saved);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof DirectoryAccessError) $tip(error.message, "error");
      else $tip("无法选择存放位置", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {failed || orgs.length === 0 ? null : (
        <Tabs value={active} onValueChange={setChosen}>
          <TabsList
            className="h-auto max-w-full justify-start overflow-x-auto overflow-y-hidden"
            aria-label="组织"
          >
            {orgs.map((org) => (
              <TabsTrigger key={org.id} value={org.id}>
                {org.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-medium">存储设置</h2>
        {failed ? (
          <p className="text-sm text-muted-foreground">组织列表加载失败</p>
        ) : (
          <div className="flex flex-col gap-2">
            <Label>存放位置</Label>
            <Button
              type="button"
              variant="outline"
              className="w-fit max-w-full"
              disabled={busy}
              onClick={() => void chooseDirectory()}
            >
              <FolderOpen />
              <span className="truncate">{settings?.name ?? "选择文件夹"}</span>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
