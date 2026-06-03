import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react';
import type { ConversionInput, ConversionResult } from '@markitdownjs/shared';

interface MarkItDownContextValue {
  convert: (input: ConversionInput) => Promise<ConversionResult>;
  convertToMarkdown: (input: ConversionInput) => Promise<string>;
  convertToJson: (input: ConversionInput) => Promise<string>;
}

const MarkItDownContext = createContext<MarkItDownContextValue | null>(null);

export interface MarkItDownProviderProps {
  children: ReactNode;
}

export function MarkItDownProvider({ children }: MarkItDownProviderProps) {
  const parserRef = useRef<import('@markitdownjs/core').MarkItDown | null>(null);

  const getParser = useCallback(async () => {
    if (!parserRef.current) {
      const { MarkItDown } = await import('@markitdownjs/core');
      parserRef.current = new MarkItDown();
    }
    return parserRef.current;
  }, []);

  const convert = useCallback(async (input: ConversionInput) => {
    const parser = await getParser();
    return parser.convert(input);
  }, [getParser]);

  const convertToMarkdown = useCallback(async (input: ConversionInput) => {
    const parser = await getParser();
    return parser.convertToMarkdown(input);
  }, [getParser]);

  const convertToJson = useCallback(async (input: ConversionInput) => {
    const parser = await getParser();
    return parser.convertToJson(input);
  }, [getParser]);

  return (
    <MarkItDownContext.Provider value={{ convert, convertToMarkdown, convertToJson }}>
      {children}
    </MarkItDownContext.Provider>
  );
}

export function useMarkItDown(): MarkItDownContextValue {
  const context = useContext(MarkItDownContext);
  if (!context) {
    throw new Error('useMarkItDown must be used within a MarkItDownProvider');
  }
  return context;
}
