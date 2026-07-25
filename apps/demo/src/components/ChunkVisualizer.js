import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
const contentTypeColors = {
    narrative: { bg: "#eff6ff", border: "#3b82f6" },
    table: { bg: "#f0fdf4", border: "#22c55e" },
    code: { bg: "#fefce8", border: "#eab308" },
    list: { bg: "#fdf4ff", border: "#c026d3" },
    "heading-only": { bg: "#f8fafc", border: "#94a3b8" },
    mixed: { bg: "#f5f3ff", border: "#7c3aed" },
};
export function ChunkVisualizer({ chunks }) {
    const [expandedChunk, setExpandedChunk] = useState(null);
    const toggleChunk = (index) => {
        setExpandedChunk(expandedChunk === index ? null : index);
    };
    const copyChunk = async (content) => {
        try {
            await navigator.clipboard.writeText(content);
        }
        catch {
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
    return (_jsxs("div", { className: "chunk-visualizer", children: [_jsxs("div", { className: "chunk-header", children: [_jsxs("h3", { children: ["Document Chunks (", chunks.length, ")"] }), _jsxs("span", { className: "chunk-summary", children: [totalTokens.toLocaleString(), " total tokens"] })] }), _jsx("div", { className: "chunk-list", children: chunks.map((chunk, index) => {
                    const colors = contentTypeColors[chunk.metadata.contentType ?? "mixed"] ??
                        contentTypeColors.mixed;
                    const isExpanded = expandedChunk === index;
                    return (_jsxs("div", { className: "chunk-card", style: { borderLeftColor: colors.border }, onClick: () => toggleChunk(index), children: [_jsxs("div", { className: "chunk-card-header", children: [_jsxs("div", { className: "chunk-badges", children: [chunk.metadata.contentType && (_jsx("span", { className: "chunk-type-badge", style: { backgroundColor: colors.bg, color: colors.border }, children: chunk.metadata.contentType })), _jsxs("span", { className: "chunk-tokens", children: [chunk.metadata.tokenCount, " tokens"] }), chunk.metadata.page != null && (_jsxs("span", { className: "chunk-page", children: ["p.", chunk.metadata.page] }))] }), _jsxs("div", { className: "chunk-actions", children: [_jsx("button", { className: "btn btn-xs btn-outline", onClick: (e) => {
                                                    e.stopPropagation();
                                                    copyChunk(chunk.content);
                                                }, children: "Copy" }), _jsx("span", { className: "expand-icon", children: isExpanded ? "▾" : "▸" })] })] }), chunk.metadata.headingPath.length > 0 && (_jsx("div", { className: "chunk-path", children: chunk.metadata.headingPath.map((heading, i) => (_jsxs("span", { className: "heading-segment", children: [i > 0 && _jsx("span", { className: "separator", children: "\u203A" }), heading] }, i))) })), isExpanded && (_jsx("pre", { className: "chunk-content", children: chunk.content }))] }, chunk.id));
                }) })] }));
}
