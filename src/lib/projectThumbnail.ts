export const THUMBNAIL_MAX_BYTES = 1024 * 1024;
export const THUMBNAIL_SOURCE_MAX_BYTES = 10 * 1024 * 1024;

export function projectThumbnailSrc(
  thumbnailUrl?: string | null,
  coverUrl?: string | null,
): string | undefined {
  const thumbnail = thumbnailUrl?.trim();
  if (thumbnail) return thumbnail;
  const cover = coverUrl?.trim();
  return cover || undefined;
}

export async function fileFromPreview(url: string, fileName: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("封面无法读取");
  const blob = await response.blob();
  const type = blob.type || "image/png";
  const name = /\.(jpe?g|png|gif)$/i.test(fileName)
    ? fileName
    : `cover.${type === "image/jpeg" ? "jpg" : type === "image/gif" ? "gif" : "png"}`;
  return new File([blob], name, { type });
}
