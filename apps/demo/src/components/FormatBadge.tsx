interface FormatBadgeProps {
  converterId: string;
}

const formatColors: Record<string, { bg: string; text: string; label: string }> = {
  pdf: { bg: "#fef2f2", text: "#dc2626", label: "PDF" },
  docx: { bg: "#eff6ff", text: "#2563eb", label: "DOCX" },
  pptx: { bg: "#fdf4ff", text: "#c026d3", label: "PPTX" },
  xlsx: { bg: "#f0fdf4", text: "#16a34a", label: "XLSX" },
  html: { bg: "#fff7ed", text: "#ea580c", label: "HTML" },
  csv: { bg: "#f5f3ff", text: "#7c3aed", label: "CSV" },
  json: { bg: "#f8fafc", text: "#475569", label: "JSON" },
  xml: { bg: "#f0f9ff", text: "#0284c7", label: "XML" },
  epub: { bg: "#ecfdf5", text: "#059669", label: "EPUB" },
  audio: { bg: "#faf5ff", text: "#9333ea", label: "AUDIO" },
  "image-ocr": { bg: "#fefce8", text: "#ca8a04", label: "OCR" },
  archive: { bg: "#f1f5f9", text: "#475569", label: "ARCHIVE" },
};

export function FormatBadge({ converterId }: FormatBadgeProps) {
  const key = converterId.replace("@markitdownjs/", "");
  const config = formatColors[key] ?? {
    bg: "#f1f5f9",
    text: "#475569",
    label: key.toUpperCase(),
  };

  return (
    <span
      className="format-badge"
      style={{
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      {config.label}
    </span>
  );
}
