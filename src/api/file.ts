import { USE_MOCK, mockCreateFileUpload } from "@/mock";
import { commonRequest } from "@/api/request";
import type { CreateFileReqDTO, ResourceCreateVO } from "@/types/file";

export async function createFileUpload(dto: CreateFileReqDTO): Promise<ResourceCreateVO> {
  if (USE_MOCK) {
    return mockCreateFileUpload(dto);
  }
  return commonRequest("/file/upload", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
