import { useState, useCallback } from "react";
import {
  DocumentDropzone,
  MarkdownViewer,
} from "@markitdownjs/react";
import type { ConversionResult } from "@markitdownjs/shared";
import { ChunkVisualizer } from "./components/ChunkVisualizer.js";
import { FormatBadge } from "./components/FormatBadge.js";

type ViewMode = "rendered" | "source";

function App() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("rendered");
  const [copied, setCopied] = useState(false);
  const [showChunks, setShowChunks] = useState(false);

  const handleConvert = useCallback((conversionResult: ConversionResult) => {
    setResult(conversionResult);
    setError(null);
    setShowChunks(false);
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>
            <span className="logo">📄</span> MarkItDownJS
          </h1>
          <span className="version-badge">Demo</span>
        </div>
        <p className="subtitle">
          Drop any document to convert it to Markdown — powered by{" "}
          <a href="https://github.com/instax-dutta/MarkItDownJS">MarkItDownJS</a>
        </p>
      </header>

      <main className="app-main">
        {!result && !isConverting && (
          <section className="drop-section">
            <DocumentDropzone
              onConvert={handleConvert}
              onError={handleError}
              className="dropzone"
            />
            {error && <div className="error-message">{error}</div>}
          </section>
        )}

        {result && (
          <section className="result-section">
            <div className="result-header">
              <div className="result-info">
                <FormatBadge converterId={result.converterId} />
                <span className="file-name">{fileName || "document"}</span>
                {result.metadata.wordCount != null && (
                  <span className="word-count">
                    {result.metadata.wordCount.toLocaleString()} words
                  </span>
                )}
                {result.stats?.duration != null && (
                  <span className="duration">
                    {(result.stats.duration / 1000).toFixed(1)}s
                  </span>
                )}
                {result.chunks && result.chunks.length > 0 && (
                  <span className="chunk-count">{result.chunks.length} chunks</span>
                )}
              </div>
              <div className="result-actions">
                {result.chunks && result.chunks.length > 0 && (
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowChunks(!showChunks)}
                  >
                    {showChunks ? "Hide Chunks" : "Show Chunks"}
                  </button>
                )}
                <div className="view-toggle">
                  <button
                    className={`btn btn-sm ${viewMode === "rendered" ? "btn-active" : "btn-outline"}`}
                    onClick={() => setViewMode("rendered")}
                  >
                    Rendered
                  </button>
                  <button
                    className={`btn btn-sm ${viewMode === "source" ? "btn-active" : "btn-outline"}`}
                    onClick={() => setViewMode("source")}
                  >
                    Source
                  </button>
                </div>
                <button className="btn btn-primary" onClick={handleCopy}>
                  {copied ? "✓ Copied" : "Copy Markdown"}
                </button>
                <button className="btn btn-outline" onClick={handleReset}>
                  New File
                </button>
              </div>
            </div>

            <div className="preview-area">
              {viewMode === "rendered" ? (
                <MarkdownViewer markdown={result.markdown} className="markdown-body" />
              ) : (
                <pre className="source-view">{result.markdown}</pre>
              )}
            </div>

            {showChunks && result.chunks && result.chunks.length > 0 && (
              <ChunkVisualizer chunks={result.chunks} />
            )}
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Built with{" "}
          <a href="https://github.com/instax-dutta/MarkItDownJS">MarkItDownJS</a>
          {" · "}
          <a href="https://github.com/instax-dutta/MarkItDownJS/issues">Report Issue</a>
          {" · "}
          <a href="https://github.com/instax-dutta/MarkItDownJS/discussions">Discussions</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
