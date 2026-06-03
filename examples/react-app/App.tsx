import React from 'react';
import { DocumentDropzone, MarkdownViewer, ConversionProgress } from '@markitdownjs/react';
import { useDocumentParser } from '@markitdownjs/react';
import type { ConversionResult } from '@markitdownjs/shared';

function App() {
  const { result, isConverting, error, progress } = useDocumentParser();

  const handleConvert = (conversionResult: ConversionResult) => {
    console.log('Conversion complete:', conversionResult.metadata);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>MarkItDownJS React Example</h1>
      <DocumentDropzone
        onConvert={handleConvert}
        style={{ marginBottom: '2rem' }}
      />
      {isConverting && <ConversionProgress progress={progress} />}
      {error && <div style={{ color: 'red' }}>Error: {error.message}</div>}
      {result && (
        <div>
          <h2>Result</h2>
          <MarkdownViewer markdown={result.markdown} />
        </div>
      )}
    </div>
  );
}

export default App;
