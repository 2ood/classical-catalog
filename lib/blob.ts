import "server-only";
import { del } from "@vercel/blob";

/** Constraints for client-side score uploads (see /api/scores/upload). */
export const scoreUploadOptions = {
  allowedContentTypes: ["application/pdf"],
  maximumSizeInBytes: 100 * 1024 * 1024,
  addRandomSuffix: true,
};

export function deleteBlob(url: string): Promise<void> {
  return del(url);
}
