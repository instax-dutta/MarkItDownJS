import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import type { ConversionResult } from "@markitdownjs/shared";
import { useDocumentParser } from "./hooks.js";

export interface DocumentDropzoneProps {
  onConvert: (result: ConversionResult) => void;
  onError?: (error: Error) => void;
  accept?: string[];
  disabled?: boolean;
  className?: string;
}

export function DocumentDropzone({
  onConvert,
  onError,
  accept = [".pdf", ".docx", ".pptx", ".xlsx", ".html", ".csv", ".json", ".xml", ".txt", ".md"],
  disabled = false,
  className = "",
}: DocumentDropzoneProps) {
  const { convert, isConverting, progress, error } = useDocumentParser();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const result = await convert(file);
        onConvert(result);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        onError?.(e);
      }
    },
    [convert, onConvert, onError]
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={className}
      style={{
        border: `2px dashed ${isDragOver ? "#3b82f6" : "#d1d5db"}`,
        borderRadius: "8px",
        padding: "32px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: isDragOver ? "#eff6ff" : "transparent",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        onChange={handleInputChange}
        disabled={disabled}
        style={{ display: "none" }}
      />
      {isConverting ? (
        <ConversionProgress progress={progress} />
      ) : (
        <p style={{ margin: 0, color: "#6b7280" }}>
          Drag and drop a document here, or click to browse
        </p>
      )}
      {error && (
        <p style={{ margin: "8px 0 0", color: "#ef4444", fontSize: "14px" }}>{error.message}</p>
      )}
    </div>
  );
}

export interface DocumentPreviewProps {
  result: ConversionResult;
  className?: string;
}

export function DocumentPreview({ result, className = "" }: DocumentPreviewProps) {
  return (
    <div className={className}>
      {result.metadata.title && (
        <h2 style={{ margin: "0 0 8px", fontSize: "1.25rem", fontWeight: 600 }}>
          {result.metadata.title}
        </h2>
      )}
      {result.metadata.author && (
        <p style={{ margin: "0 0 4px", color: "#6b7280", fontSize: "14px" }}>
          By {result.metadata.author}
        </p>
      )}
      {result.metadata.wordCount != null && (
        <p style={{ margin: "0 0 16px", color: "#9ca3af", fontSize: "13px" }}>
          {result.metadata.wordCount.toLocaleString()} words
        </p>
      )}
      <pre
        style={{
          margin: 0,
          padding: "16px",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          overflow: "auto",
          maxHeight: "400px",
          fontSize: "14px",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {result.markdown}
      </pre>
    </div>
  );
}

export interface MarkdownViewerProps {
  markdown: string;
  className?: string;
}

export function MarkdownViewer({ markdown, className = "" }: MarkdownViewerProps) {
  const html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");

  return (
    <div
      className={className}
      style={{ lineHeight: 1.6, fontSize: "15px" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export interface ConversionProgressProps {
  progress: number;
  className?: string;
}

export function ConversionProgress({ progress, className = "" }: ConversionProgressProps) {
  return (
    <div className={className}>
      <div
        style={{
          width: "100%",
          height: "6px",
          backgroundColor: "#e5e7eb",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: "#3b82f6",
            borderRadius: "3px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#6b7280" }}>
        Converting... {Math.round(progress)}%
      </p>
    </div>
  );
}
