'use client';

import React, { useState } from 'react';
import { useDocumentParser, MarkdownViewer } from '@markitdownjs/react';

export default function Home() {
  const { convert, result, isConverting, error } = useDocumentParser();
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      await convert(e.dataTransfer.files[0]);
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>MarkItDownJS + Next.js</h1>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#3b82f6' : '#ccc'}`,
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center',
        }}
      >
        <p>Drop a document here to convert to Markdown</p>
      </div>
      {isConverting && <p>Converting...</p>}
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
      {result && <MarkdownViewer markdown={result.markdown} />}
    </main>
  );
}
