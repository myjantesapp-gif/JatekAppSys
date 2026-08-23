import { useState, useCallback } from "react";
export function useUpload(options = {}) {
    const basePath = options.basePath ?? "/api/storage";
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const uploadFile = useCallback(async (file) => {
        setIsUploading(true);
        setError(null);
        setProgress(0);
        try {
            const extraHeaders = options.getRequestHeaders
                ? await options.getRequestHeaders()
                : {};
            if (!file.type.startsWith("image/")) {
                throw new Error("Only image files can be uploaded.");
            }
            setProgress(10);
            const uploadRes = await fetch(`${basePath}/uploads/image`, {
                method: "POST",
                headers: { "Content-Type": file.type, ...extraHeaders },
                body: file,
            });
            if (!uploadRes.ok) {
                const data = await uploadRes.json().catch(() => ({}));
                throw new Error(data.error || "Failed to upload image");
            }
            const upload = await uploadRes.json();
            setProgress(100);
            options.onSuccess?.(upload);
            return upload;
        }
        catch (err) {
            const e = err instanceof Error ? err : new Error("Upload failed");
            setError(e);
            options.onError?.(e);
            return null;
        }
        finally {
            setIsUploading(false);
        }
    }, [basePath, options]);
    return { uploadFile, isUploading, error, progress };
}
