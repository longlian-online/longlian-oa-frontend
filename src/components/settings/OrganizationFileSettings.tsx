import { useEffect, useState, type ReactElement } from "react";
import { FolderOpen } from "lucide-react";

import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import FilterSelectContent from "@/components/FilterSelectContent";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import {
  DirectoryAccessError,
  loadOrgDownloads,
  pickDownloadDirectory,
  saveOrgDirectory,
  saveOrgView,
  type SavedDownloads,
} from "@/pages/dashboard/org-admin/downloadDirectory";
import { rememberDownloads } from "@/pages/dashboard/org-admin/downloadSession";
import type { OrgFileTree } from "@/pages/dashboard/org-admin/fileLocation";
import { organizationsQuery } from "@/queries/session";

const VIEW_LABEL = { planning: "企划", type: "类型", item: "项目" } as const;

export default function OrganizationFileSettings(): ReactElement {
  const orgsQuery = useApiQuery(organizationsQuery);
  const orgs = orgsQuery.data ?? [];
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

  const status = orgsQuery.isLoading
    ? "正在读取组织"
    : orgsQuery.isError
      ? "组织列表加载失败"
      : orgs.length === 0
        ? "还没有加入组织"
        : null;

  const view = settings?.view ?? "planning";

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

  async function changeView(next: OrgFileTree): Promise<void> {
    if (!active || next === view) return;
    try {
      const saved = await saveOrgView(active, next);
      setSettings(saved);
      if (active === currentOrgId) rememberDownloads(saved);
    } catch {
      $tip("无法保存存储视图", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {status === null ? (
        <Tabs value={active} onValueChange={setChosen}>
          <TabsList className="max-w-full overflow-x-auto" aria-label="组织">
            {orgs.map((org) => (
              <TabsTrigger key={org.id} value={org.id}>
                {org.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-base font-medium">存储设置</h2>
        {status !== null ? (
          <p className="text-sm text-muted-foreground">{status}</p>
        ) : (
          <>
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
            <div className="flex flex-col gap-2">
              <Label id={`${active}-storage-view`}>存储视图</Label>
              <Select
                value={view}
                onValueChange={(value) => {
                  if (value !== "planning" && value !== "type" && value !== "item") return;
                  void changeView(value);
                }}
              >
                <SelectTrigger aria-labelledby={`${active}-storage-view`} className="w-40">
                  <SelectValue>{VIEW_LABEL[view]}</SelectValue>
                </SelectTrigger>
                <FilterSelectContent>
                  {(Object.keys(VIEW_LABEL) as OrgFileTree[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {VIEW_LABEL[item]}
                    </SelectItem>
                  ))}
                </FilterSelectContent>
              </Select>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
