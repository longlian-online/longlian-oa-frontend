import { useEffect, useState } from "react";
import { Building2, ImagePlus, Loader2, Save } from "lucide-react";

import { getOrganizationInfo, updateOrganizationInfo } from "@/api/organizationAdmin";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import FileUpload from "@/components/FileUpload";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showApiError } from "@/lib/apiError";
import { getCurrentOrgId } from "@/lib/session";
import type { UploadedFileInfo } from "@/types/file";
import type { OrganizationInfoVO } from "@/types/organizationAdmin";

interface OrganizationForm {
  name: string;
  description: string;
}

function OrganizationSettingsContent() {
  const [organization, setOrganization] = useState<OrganizationInfoVO | null>(null);
  const [form, setForm] = useState<OrganizationForm>({ name: "", description: "" });
  const [avatarFile, setAvatarFile] = useState<UploadedFileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadOrganization();
  }, []);

  async function loadOrganization(): Promise<void> {
    try {
      setLoading(true);
      const data = await getOrganizationInfo();
      setOrganization(data);
      setForm({ name: data.name, description: data.description ?? "" });
      setAvatarFile(
        data.avatarUrl
          ? {
              fileId: data.avatarFileId ?? "",
              fileName: "组织头像",
              fileSize: 0,
              fileMime: "image/*",
              previewUrl: data.avatarUrl,
            }
          : null,
      );
    } catch (error) {
      showApiError(error, "组织信息加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(): Promise<void> {
    const name = form.name.trim();
    if (!name) {
      $tip("请输入组织名称", "error");
      return;
    }

    if (!organization) return;

    if (organization.avatarUrl && !avatarFile?.fileId) {
      $tip("当前组织头像缺少文件 ID，暂时无法安全保存资料，请重新上传头像后再保存", "error");
      return;
    }

    try {
      setSaving(true);
      await updateOrganizationInfo({
        avatarFileId: avatarFile?.fileId ?? "",
        name,
        description: form.description.trim(),
      });
      $tip("组织信息已保存", "success");
      await loadOrganization();
    } catch (error) {
      showApiError(error, "组织信息保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        正在加载组织信息...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">组织设置</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理组织在用户端展示的基础信息。</p>
        </div>
        <Button type="button" disabled={saving || !organization} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          保存修改
        </Button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImagePlus className="size-4 text-muted-foreground" />
              <CardTitle>组织头像</CardTitle>
            </div>
            <CardDescription>头像会展示在组织入口和成员相关页面。</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              bizType="avatar"
              bizId={organization?.id ?? getCurrentOrgId() ?? "organization"}
              value={avatarFile}
              title="上传组织头像"
              description="支持 JPG、PNG、GIF，最大 5MB"
              imagePreview
              accept={["jpg", "jpeg", "png", "gif"]}
              maxSize={5 * 1024 * 1024}
              className="[&>button]:min-h-56"
              onChange={setAvatarFile}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <CardTitle>基础信息</CardTitle>
            </div>
            <CardDescription>这些信息会作为组织的公开介绍展示。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              组织名称
              <Input
                value={form.name}
                maxLength={50}
                placeholder="请输入组织名称"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              组织简介
              <Textarea
                value={form.description}
                maxLength={500}
                placeholder="介绍一下你的组织"
                className="min-h-36 resize-y"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
              <span className="text-right text-xs font-normal text-muted-foreground">
                {form.description.length}/500
              </span>
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OrganizationSettingsPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationSettingsContent />
    </OrganizationAdminGuard>
  );
}
