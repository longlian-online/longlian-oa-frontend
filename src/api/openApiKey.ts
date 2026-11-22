import { request } from "@/api/request";

import type { OpenApiKeyCreatedVO, OpenApiKeyGroupVO, OpenApiKeyNameDTO } from "@/types/openApiKey";

export async function listOpenApiKeys(): Promise<OpenApiKeyGroupVO[]> {
  return request("/openapi-keys");
}

export async function createOpenApiKey(dto: OpenApiKeyNameDTO): Promise<OpenApiKeyCreatedVO> {
  return request("/openapi-keys", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function revokeOpenApiKey(id: number): Promise<void> {
  await request(`/openapi-keys/${id}`, {
    method: "DELETE",
  });
}
