import { request } from "@/api/request";

export function getMcpOrganizations(): Promise<{ id: string; name: string }[]> {
  return request("/user/organizations/api-key-settings");
}

export interface McpApiKeyInfo {
  id: string | null;
  orgId: string;
  state: "NOT_CREATED" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  prefix: string | null;
  generatedAt: string | null;
  revokedAt: string | null;
  suspendedReason: string | null;
  canGenerate: boolean;
  canRevoke: boolean;
}

export interface GeneratedMcpApiKey {
  mcpUrl: string;
  id: string;
  orgId: string;
  apiKey: string;
  prefix: string;
  generatedAt: string;
}

export function getMcpApiKey(orgId: string): Promise<McpApiKeyInfo> {
  return request(`/user/organizations/${orgId}/api-keys/current`);
}

export function generateMcpApiKey(orgId: string): Promise<GeneratedMcpApiKey> {
  return request(`/user/organizations/${orgId}/api-keys`, { method: "POST" });
}

export function revokeMcpApiKey(orgId: string): Promise<void> {
  return request(`/user/organizations/${orgId}/api-keys/current`, { method: "DELETE" });
}
