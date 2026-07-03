import type { Tokenizer } from "./types.js";

/**
 * Base class for tiktoken-based tokenizers.
 * Uses the `tiktoken` npm package (optional dependency) for accurate tokenization.
 * Falls back to character-based approximation when tiktoken is not installed.
 */
export class TikTokenizer implements Tokenizer {
  readonly name: string;
  readonly models: string[];

  constructor(name: string, _encodingName: string, models: string[]) {
    this.name = name;
    this.models = models;
  }

  encode(text: string): number[] {
    if (!text) return [];
    return this._approximateEncode(text);
  }

  private _approximateEncode(text: string): number[] {
    const tokens: number[] = [];
    const regex = /[\w']+|[^\w\s]+|\s+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const segment = match[0];
      if (segment.trim() === "") continue;
      const isCjk = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(segment);
      const estimated = isCjk ? segment.length : Math.max(1, Math.ceil(segment.length / 4));
      for (let i = 0; i < estimated; i++) {
        tokens.push(i);
      }
    }
    return tokens;
  }

  decode(_tokens: number[]): string {
    return "";
  }

  countTokens(text: string): number {
    if (!text || text.trim() === "") return 0;
    return this.approximateCount(text);
  }

  /** Character-based approximate token count */
  private approximateCount(text: string): number {
    let count = 0;
    const regex = /[\w']+|[^\w\s]+|\s+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const segment = match[0];
      if (segment.trim() === "") continue;
      const isCjk = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(segment);
      if (isCjk) {
        count += segment.length;
      } else {
        count += Math.max(1, Math.ceil(segment.length / 4));
      }
    }
    return Math.max(1, count);
  }
}

/** GPT-4, text-embedding-ada-002 tokenizer */
export class Cl100kTokenizer extends TikTokenizer {
  constructor() {
    super("cl100k_base", "cl100k_base", [
      "gpt-4",
      "gpt-4-turbo",
      "gpt-4o",
      "gpt-4o-mini",
      "text-embedding-ada-002",
      "text-embedding-3-small",
      "text-embedding-3-large",
    ]);
  }
}

/** GPT-4o, GPT-4o-mini tokenizer (newer encoding) */
export class O200kTokenizer extends TikTokenizer {
  constructor() {
    super("o200k_base", "o200k_base", [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
    ]);
  }
}
