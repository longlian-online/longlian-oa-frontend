import { useState, type ReactElement } from "react";

import { getMcpOrganizations } from "@/api/mcpApiKey";
import OrganizationFileSettings from "@/components/settings/OrganizationFileSettings";
import OrganizationMcpSettings from "@/components/settings/OrganizationMcpSettings";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";

export default function OrganizationSettings(): ReactElement {
  const orgsQuery = useApiQuery({
    key: ["organizationSettings"],
    scope: "account",
    queryFn: getMcpOrganizations,
  });
  const orgs = orgsQuery.data ?? [];
  const currentOrgId = useSessionSnapshot().orgId;
  const [chosen, setChosen] = useState<string | null>(null);
  const active =
    chosen && orgs.some((org) => org.id === chosen)
      ? chosen
      : (orgs.find((org) => org.id === currentOrgId)?.id ?? orgs[0]?.id ?? "");
  const status = orgsQuery.isLoading
    ? "正在读取组织"
    : orgsQuery.isError
      ? "组织列表加载失败"
      : orgs.length === 0
        ? "还没有加入组织"
        : null;

  return (
    <div className="flex flex-col gap-4">
      {status === null ? (
        <>
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
          <OrganizationFileSettings key={`file-${active}`} orgId={active} />
          <OrganizationMcpSettings
            key={`mcp-${active}`}
            orgId={active}
            orgName={orgs.find((org) => org.id === active)?.name ?? ""}
          />
        </>
      ) : (
        <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-heading text-base font-medium">存储设置</h2>
          <p className="text-sm text-muted-foreground">{status}</p>
        </section>
      )}
    </div>
  );
}
