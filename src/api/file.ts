import { commonRequest } from "@/api/request";
import type { CreateFileReqDTO, ResourceCreateVO } from "@/types/file";

export async function createFileUpload(dto: CreateFileReqDTO): Promise<ResourceCreateVO> {
  return commonRequest("/file/upload", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
