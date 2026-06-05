interface ValidateFileOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
}

export async function handleFileUpload(request: Request): Promise<File> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      throw new Error("No file provided in form data");
    }
    return file;
  }

  const body = await request.arrayBuffer();
  const fileName = request.headers.get("x-file-name") ?? "unknown";
  const mimeType = request.headers.get("content-type") ?? "application/octet-stream";
  return new File([body], fileName, { type: mimeType });
}

export function validateFile(
  file: File,
  options: ValidateFileOptions = {}
): { valid: boolean; error?: string } {
  if (options.maxFileSize && file.size > options.maxFileSize) {
    const maxMB = Math.round(options.maxFileSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds ${maxMB}MB limit` };
  }

  if (options.allowedTypes && options.allowedTypes.length > 0) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !options.allowedTypes.includes(ext)) {
      return { valid: false, error: `File type .${ext ?? "?"} is not allowed` };
    }
  }

  return { valid: true };
}
