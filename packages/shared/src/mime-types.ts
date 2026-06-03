import type { MimeType, FileExtension } from "./types.js";

const EXTENSION_TO_MIME: Record<FileExtension, MimeType> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".json": "application/json",
  ".xml": "application/xml",
  ".html": "text/html",
  ".htm": "text/html",
  ".mhtml": "multipart/related",
  ".epub": "application/epub+zip",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".bmp": "image/bmp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
};

const MIME_TO_EXTENSION: Record<string, FileExtension> = Object.fromEntries(
  Object.entries(EXTENSION_TO_MIME).map(([ext, mime]) => [mime, ext])
);

export function extensionToMime(extension: FileExtension): MimeType | undefined {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return EXTENSION_TO_MIME[ext.toLowerCase()];
}

export function mimeToExtension(mimeType: MimeType): FileExtension | undefined {
  return MIME_TO_EXTENSION[mimeType.toLowerCase()];
}

export function detectMimeType(fileName: string): MimeType | undefined {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return undefined;
  const ext = fileName.substring(dotIndex);
  return extensionToMime(ext);
}

export function isSupportedExtension(extension: FileExtension): boolean {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return ext.toLowerCase() in EXTENSION_TO_MIME;
}

export function isSupportedMimeType(mimeType: MimeType): boolean {
  return mimeType.toLowerCase() in MIME_TO_EXTENSION;
}

export function getSupportedExtensions(): FileExtension[] {
  return Object.keys(EXTENSION_TO_MIME);
}

export function getSupportedMimeTypes(): MimeType[] {
  return Object.keys(MIME_TO_EXTENSION);
}
