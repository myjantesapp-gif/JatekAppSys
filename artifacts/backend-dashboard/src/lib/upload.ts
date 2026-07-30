import { apiFetch } from "@/lib/api";

interface UploadUrlResponse {
  uploadURL: string;
  objectPath: string;
}

/**
 * Uploads an image file using the presigned URL system.
 * Returns the serving URL for storage in the DB.
 */
export async function uploadImage(file: File): Promise<string> {
  const result = await apiFetch("/api/storage/uploads/request-url", {
    method: "POST",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  }) as UploadUrlResponse;

  const uploadRes = await fetch(result.uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload échoué (${uploadRes.status})`);
  }

  // objectPath is like /objects/uploads/<uuid>
  // served at /api/storage/objects/<path_after_objects>
  const pathPart = result.objectPath.replace(/^\/objects/, "");
  return `/api/storage/objects${pathPart}`;
}
