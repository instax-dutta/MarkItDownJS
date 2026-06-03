import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConversionResult, ConversionOptions, ProgressInfo } from '@markitdownjs/shared';

interface UseDocumentParserReturn {
  convert: (file: File, options?: ConversionOptions) => Promise<ConversionResult>;
  result: ConversionResult | null;
  isConverting: boolean;
  error: Error | null;
  progress: number;
  reset: () => void;
}

export function useDocumentParser(): UseDocumentParserReturn {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const convert = useCallback(async (file: File, options?: ConversionOptions) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsConverting(true);
    setError(null);
    setProgress(0);
    setResult(null);
    try {
      const { MarkItDown } = await import('@markitdownjs/core');
      const parser = new MarkItDown();
      const conversionResult = await parser.convert({
        data: file,
        fileName: file.name,
        mimeType: file.type || undefined,
        options: {
          ...options,
          signal: abortRef.current.signal,
          onProgress: (info: ProgressInfo) => setProgress(info.percentage),
        },
      });
      setResult(conversionResult);
      return conversionResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsConverting(false);
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResult(null);
    setError(null);
    setProgress(0);
    setIsConverting(false);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { convert, result, isConverting, error, progress, reset };
}

interface UseMarkdownConversionReturn {
  markdown: string | null;
  isConverting: boolean;
  error: Error | null;
  convertToMarkdown: (file: File) => Promise<string>;
  convertToJson: (file: File) => Promise<string>;
}

export function useMarkdownConversion(): UseMarkdownConversionReturn {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const convertToMarkdown = useCallback(async (file: File) => {
    setIsConverting(true);
    setError(null);
    try {
      const { MarkItDown } = await import('@markitdownjs/core');
      const parser = new MarkItDown();
      const md = await parser.convertToMarkdown(file);
      setMarkdown(md);
      return md;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsConverting(false);
    }
  }, []);

  const convertToJson = useCallback(async (file: File) => {
    setIsConverting(true);
    setError(null);
    try {
      const { MarkItDown } = await import('@markitdownjs/core');
      const parser = new MarkItDown();
      return await parser.convertToJson(file);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsConverting(false);
    }
  }, []);

  return { markdown, isConverting, error, convertToMarkdown, convertToJson };
}
