import { useState, useCallback, useRef, useEffect, useContext } from "react";
import type { ConversionResult, ConversionOptions, ProgressInfo } from "@markitdownjs/shared";
import { MarkItDownContext, type MarkItDownParser } from "./provider.js";

interface UseDocumentParserReturn {
  convert: (file: File, options?: ConversionOptions) => Promise<ConversionResult>;
  result: ConversionResult | null;
  isConverting: boolean;
  error: Error | null;
  progress: number;
  reset: () => void;
}

function useConfiguredParser(parser?: MarkItDownParser): {
  getParser: () => Promise<MarkItDownParser>;
} {
  const context = useContext(MarkItDownContext);
  const parserRef = useRef<MarkItDownParser | null>(parser ?? null);

  const getParser = useCallback(async (): Promise<MarkItDownParser> => {
    if (parserRef.current) return parserRef.current;
    // Prefer the parser configured on the MarkItDownProvider.
    if (context?.parser) {
      parserRef.current = context.parser;
      return parserRef.current;
    }
    const { MarkItDown } = await import("@markitdownjs/core");
    parserRef.current = new MarkItDown() as unknown as MarkItDownParser;
    return parserRef.current;
  }, [context]);

  return { getParser };
}

export function useDocumentParser(parser?: MarkItDownParser): UseDocumentParserReturn {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const { getParser } = useConfiguredParser(parser);

  const convert = useCallback(
    async (file: File, options?: ConversionOptions) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setIsConverting(true);
      setError(null);
      setProgress(0);
      setResult(null);
      try {
        const p = await getParser();
        const conversionResult = await p.convert({
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
    },
    [getParser]
  );

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

export function useMarkdownConversion(parser?: MarkItDownParser): UseMarkdownConversionReturn {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getParser } = useConfiguredParser(parser);

  const convertToMarkdown = useCallback(
    async (file: File) => {
      setIsConverting(true);
      setError(null);
      try {
        const p = await getParser();
        const md = p.convertToMarkdown
          ? await p.convertToMarkdown(file)
          : (await p.convert(file)).markdown;
        setMarkdown(md);
        return md;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsConverting(false);
      }
    },
    [getParser]
  );

  const convertToJson = useCallback(
    async (file: File) => {
      setIsConverting(true);
      setError(null);
      try {
        const p = await getParser();
        if (p.convertToJson) return await p.convertToJson(file);
        return JSON.stringify(await p.convert(file));
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsConverting(false);
      }
    },
    [getParser]
  );

  return { markdown, isConverting, error, convertToMarkdown, convertToJson };
}
