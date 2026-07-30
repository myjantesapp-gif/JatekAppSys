import { useState, useCallback } from "react";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  basePath?: string;
  getRequestHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const basePath = options.basePath ?? "/api/storage";
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const extraHeaders = options.getRequestHeaders
          ? await options.getRequestHeaders()
          : {};

        setProgress(10);
        const presignRes = await fetch(`${basePath}/uploads/request-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...extraHeaders },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });
        if (!presignRes.ok) {
          const data = await presignRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to get upload URL");
        }
        const upload: UploadResponse = await presignRes.json();

        setProgress(30);
        const putRes = await fetch(upload.uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!putRes.ok) throw new Error("Failed to upload file to storage");

        setProgress(100);
        options.onSuccess?.(upload);
        return upload;
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Upload failed");
        setError(e);
        options.onError?.(e);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [basePath, options]
  );

  return { uploadFile, isUploading, error, progress };
}
