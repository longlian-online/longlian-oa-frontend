export interface OpenApiKeyVO {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface OpenApiKeyGroupVO {
  orgId: number;
  orgName: string;
  maxKeys: number;
  keys: OpenApiKeyVO[];
}

export interface OpenApiKeyCreatedVO {
  id: number;
  key: string;
}

export interface OpenApiKeyNameDTO {
  name: string;
}
