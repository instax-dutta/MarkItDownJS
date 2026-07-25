import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { DocumentDropzone, MarkdownViewer, } from "@markitdownjs/react";
import { ChunkVisualizer } from "./components/ChunkVisualizer.js";
import { FormatBadge } from "./components/FormatBadge.js";
function App() {
    const [result, setResult] = useState(null);
    const [fileName, setFileName] = useState("");
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState("rendered");
    const [copied, setCopied] = useState(false);
    const [showChunks, setShowChunks] = useState(false);
    const handleConvert = useCallback((conversionResult) => {
        setResult(conversionResult);
        setError(null);
        setShowChunks(false);
    }, []);
    const handleError = useCallback((err) => {
        setError(err.message);
    }, []);
    const handleCopy = useCallback(async () => {
        if (!result)
            return;
        try {
            await navigator.clipboard.writeText(result.markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            // Fallback
            const textarea = document.createElement("textarea");
            textarea.value = result.markdown;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [result]);
    const handleReset = useCallback(() => {
        setResult(null);
        setFileName("");
        setError(null);
        setShowChunks(false);
    }, []);
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "app-header", children: [_jsxs("div", { className: "header-top", children: [_jsxs("h1", { children: [_jsx("span", { className: "logo", children: "\uD83D\uDCC4" }), " MarkItDownJS"] }), _jsx("span", { className: "version-badge", children: "Demo" })] }), _jsxs("p", { className: "subtitle", children: ["Drop any document to convert it to Markdown \u2014 powered by", " ", _jsx("a", { href: "https://github.com/instax-dutta/MarkItDownJS", children: "MarkItDownJS" })] })] }), _jsxs("main", { className: "app-main", children: [!result && !isConverting && (_jsxs("section", { className: "drop-section", children: [_jsx(DocumentDropzone, { onConvert: handleConvert, onError: handleError, className: "dropzone" }), error && _jsx("div", { className: "error-message", children: error })] })), result && (_jsxs("section", { className: "result-section", children: [_jsxs("div", { className: "result-header", children: [_jsxs("div", { className: "result-info", children: [_jsx(FormatBadge, { converterId: result.converterId }), _jsx("span", { className: "file-name", children: fileName || "document" }), result.metadata.wordCount != null && (_jsxs("span", { className: "word-count", children: [result.metadata.wordCount.toLocaleString(), " words"] })), result.stats?.duration != null && (_jsxs("span", { className: "duration", children: [(result.stats.duration / 1000).toFixed(1), "s"] })), result.chunks && result.chunks.length > 0 && (_jsxs("span", { className: "chunk-count", children: [result.chunks.length, " chunks"] }))] }), _jsxs("div", { className: "result-actions", children: [result.chunks && result.chunks.length > 0 && (_jsx("button", { className: "btn btn-outline", onClick: () => setShowChunks(!showChunks), children: showChunks ? "Hide Chunks" : "Show Chunks" })), _jsxs("div", { className: "view-toggle", children: [_jsx("button", { className: `btn btn-sm ${viewMode === "rendered" ? "btn-active" : "btn-outline"}`, onClick: () => setViewMode("rendered"), children: "Rendered" }), _jsx("button", { className: `btn btn-sm ${viewMode === "source" ? "btn-active" : "btn-outline"}`, onClick: () => setViewMode("source"), children: "Source" })] }), _jsx("button", { className: "btn btn-primary", onClick: handleCopy, children: copied ? "✓ Copied" : "Copy Markdown" }), _jsx("button", { className: "btn btn-outline", onClick: handleReset, children: "New File" })] })] }), _jsx("div", { className: "preview-area", children: viewMode === "rendered" ? (_jsx(MarkdownViewer, { markdown: result.markdown, className: "markdown-body" })) : (_jsx("pre", { className: "source-view", children: result.markdown })) }), showChunks && result.chunks && result.chunks.length > 0 && (_jsx(ChunkVisualizer, { chunks: result.chunks }))] }))] }), _jsx("footer", { className: "app-footer", children: _jsxs("p", { children: ["Built with", " ", _jsx("a", { href: "https://github.com/instax-dutta/MarkItDownJS", children: "MarkItDownJS" }), " · ", _jsx("a", { href: "https://github.com/instax-dutta/MarkItDownJS/issues", children: "Report Issue" }), " · ", _jsx("a", { href: "https://github.com/instax-dutta/MarkItDownJS/discussions", children: "Discussions" })] }) })] }));
}
export default App;
