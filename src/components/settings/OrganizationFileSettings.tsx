import { useEffect, useState, type ReactElement } from "react";
import { FolderOpen } from "lucide-react";

import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import {
  DirectoryAccessError,
  loadOrgDownloads,
  pickDownloadDirectory,
  saveOrgDirectory,
  type SavedDownloads,
} from "@/pages/dashboard/org-admin/downloadDirectory";
import { rememberDownloads } from "@/pages/dashboard/org-admin/downloadSession";

interface OrganizationFileSettingsProps {
  orgId: string;
}

export default function OrganizationFileSettings({
  orgId,
}: OrganizationFileSettingsProps): ReactElement {
  const currentOrgId = useSessionSnapshot().orgId;
  const [settings, setSettings] = useState<SavedDownloads | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    void loadOrgDownloads(orgId).then((saved) => {
      if (!cancelled) setSettings(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  async function chooseDirectory(): Promise<void> {
    if (!orgId || busy) return;
    setBusy(true);
    try {
      const handle = await pickDownloadDirectory();
      const saved = await saveOrgDirectory(orgId, handle);
      setSettings(saved);
      if (orgId === currentOrgId) rememberDownloads(saved);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof DirectoryAccessError) $tip(error.message, "error");
      else $tip("无法选择存放位置", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="font-heading text-base font-medium">存储设置</h2>
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
    </section>
  );
}
