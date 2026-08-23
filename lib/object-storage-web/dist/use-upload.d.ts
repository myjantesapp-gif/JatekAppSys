interface UploadResponse {
    url: string;
    contentType: string;
}
interface UseUploadOptions {
    basePath?: string;
    getRequestHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
    onSuccess?: (response: UploadResponse) => void;
    onError?: (error: Error) => void;
}
export declare function useUpload(options?: UseUploadOptions): {
    uploadFile: (file: File) => Promise<UploadResponse | null>;
    isUploading: boolean;
    error: Error | null;
    progress: number;
};
export {};
