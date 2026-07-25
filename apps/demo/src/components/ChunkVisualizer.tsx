import { useState } from "react";
import type { DocumentChunk } from "@markitdownjs/shared";

interface ChunkVisualizerProps {
  chunks: DocumentChunk[];
}

const contentTypeColors: Record<string, { bg: string; border: string }> = {
  narrative: { bg: "#eff6ff", border: "#3b82f6" },
  table: { bg: "#f0fdf4", border: "#22c55e" },
  code: { bg: "#fefce8", border: "#eab308" },
  list: { bg: "#fdf4ff", border: "#c026d3" },
  "heading-only": { bg: "#f8fafc", border: "#94a3b8" },
  mixed: { bg: "#f5f3ff", border: "#7c3aed" },
};

export function ChunkVisualizer({ chunks }: ChunkVisualizerProps) {
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);

  const toggleChunk = (index: number) => {
    setExpandedChunk(expandedChunk === index ? null : index);
  };

  const copyChunk = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const totalTokens = chunks.reduce((sum, c) => sum + c.metadata.tokenCount, 0);

  return (
    <div className="chunk-visualizer">
      <div className="chunk-header">
        <h3>Document Chunks ({chunks.length})</h3>
        <span className="chunk-summary">{totalTokens.toLocaleString()} total tokens</span>
      </div>

      <div className="chunk-list">
        {chunks.map((chunk, index) => {
          const colors =
            contentTypeColors[chunk.metadata.contentType ?? "mixed"] ??
            contentTypeColors.mixed;
          const isExpanded = expandedChunk === index;

          return (
            <div
              key={chunk.id}
              className="chunk-card"
              style={{ borderLeftColor: colors.border }}
              onClick={() => toggleChunk(index)}
            >
              <div className="chunk-card-header">
                <div className="chunk-badges">
                  {chunk.metadata.contentType && (
                    <span
                      className="chunk-type-badge"
                      style={{ backgroundColor: colors.bg, color: colors.border }}
                    >
                      {chunk.metadata.contentType}
                    </span>
                  )}
                  <span className="chunk-tokens">{chunk.metadata.tokenCount} tokens</span>
                  {chunk.metadata.page != null && (
                    <span className="chunk-page">p.{chunk.metadata.page}</span>
                  )}
                </div>
                <div className="chunk-actions">
                  <button
                    className="btn btn-xs btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyChunk(chunk.content);
                    }}
                  >
                    Copy
                  </button>
                  <span className="expand-icon">{isExpanded ? "▾" : "▸"}</span>
                </div>
              </div>

              {chunk.metadata.headingPath.length > 0 && (
                <div className="chunk-path">
                  {chunk.metadata.headingPath.map((heading, i) => (
                    <span key={i} className="heading-segment">
                      {i > 0 && <span className="separator">›</span>}
                      {heading}
                    </span>
                  ))}
                </div>
              )}

              {isExpanded && (
                <pre className="chunk-content">{chunk.content}</pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
