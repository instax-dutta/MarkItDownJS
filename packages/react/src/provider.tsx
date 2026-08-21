import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";
import type { ConversionInput, ConversionResult, Converter } from "@markitdownjs/shared";

/** Input accepted by a MarkItDown-compatible parser's `convert` method. */
export type ParserInput = ConversionInput | File | Blob | Uint8Array | ArrayBuffer | string;

/**
 * Minimal structural interface for the MarkItDown parser, so the React
 * integration does not depend on `@markitdownjs/core` at runtime. Any
 * `MarkItDown` instance satisfies this interface.
 */
export interface MarkItDownParser {
  convert(input: ParserInput): Promise<ConversionResult>;
  convertToMarkdown?(input: ParserInput): Promise<string>;
  convertToJson?(input: ParserInput): Promise<string>;
  registerConverter?(converter: Converter): void;
}

interface MarkItDownContextValue {
  convert: (input: ConversionInput) => Promise<ConversionResult>;
  convertToMarkdown: (input: ConversionInput) => Promise<string>;
  convertToJson: (input: ConversionInput) => Promise<string>;
  /** The parser configured on the provider (null until one is available). */
  parser: MarkItDownParser | null;
}

export const MarkItDownContext = createContext<MarkItDownContextValue | null>(null);

export interface MarkItDownProviderProps {
  children: ReactNode;
  /** Pre-configured parser. When omitted, a parser is created lazily on first use. */
  parser?: MarkItDownParser;
  /** Converters to register on the parser (once). */
  converters?: Converter[];
}

export function MarkItDownProvider({ children, parser, converters }: MarkItDownProviderProps) {
  const parserRef = useRef<MarkItDownParser | null>(parser ?? null);
  const registeredRef = useRef<Set<string>>(new Set());

  const getParser = useCallback(async (): Promise<MarkItDownParser> => {
    if (!parserRef.current) {
      const { MarkItDown } = await import("@markitdownjs/core");
      parserRef.current = new MarkItDown() as unknown as MarkItDownParser;
    }
    if (converters && converters.length > 0) {
      for (const converter of converters) {
        if (!registeredRef.current.has(converter.id)) {
          parserRef.current.registerConverter?.(converter);
          registeredRef.current.add(converter.id);
        }
      }
    }
    return parserRef.current;
  }, [converters]);

  const convert = useCallback(
    async (input: ConversionInput) => {
      const p = await getParser();
      return p.convert(input);
    },
    [getParser]
  );

  const convertToMarkdown = useCallback(
    async (input: ConversionInput) => {
      const p = await getParser();
      if (p.convertToMarkdown) return p.convertToMarkdown(input);
      return (await p.convert(input)).markdown;
    },
    [getParser]
  );

  const convertToJson = useCallback(
    async (input: ConversionInput) => {
      const p = await getParser();
      if (p.convertToJson) return p.convertToJson(input);
      return JSON.stringify(await p.convert(input));
    },
    [getParser]
  );

  return (
    <MarkItDownContext.Provider
      value={{ convert, convertToMarkdown, convertToJson, parser: parserRef.current }}
    >
      {children}
    </MarkItDownContext.Provider>
  );
}

export function useMarkItDown(): MarkItDownContextValue {
  const context = useContext(MarkItDownContext);
  if (!context) {
    throw new Error("useMarkItDown must be used within a MarkItDownProvider");
  }
  return context;
}
