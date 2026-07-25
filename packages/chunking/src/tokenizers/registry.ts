import type { Tokenizer } from "./types.js";
import { FastBPETokenizer } from "./fast-bpe.js";
import { Cl100kTokenizer } from "./tiktoken.js";
import { O200kTokenizer } from "./tiktoken.js";

/**
 * Registry for looking up tokenizers by name or model.
 * Ships with three built-in tokenizers; users can register custom ones.
 */
export class TokenizerRegistry {
  private tokenizers = new Map<string, Tokenizer>();
  private modelMap = new Map<string, Tokenizer>();

  constructor() {
    // Register built-in tokenizers.
    const fastBpe = new FastBPETokenizer();
    const cl100k = new Cl100kTokenizer();
    const o200k = new O200kTokenizer();

    this.register(fastBpe);
    this.register(cl100k);
    this.register(o200k);
  }

  /** Register a tokenizer. Overwrites if name already exists. */
  register(tokenizer: Tokenizer): void {
    this.tokenizers.set(tokenizer.name, tokenizer);
    for (const model of tokenizer.models) {
      this.modelMap.set(model.toLowerCase(), tokenizer);
    }
  }

  /** Get a tokenizer by name (e.g., "cl100k_base", "o200k_base", "fast-bpe") */
  getByName(name: string): Tokenizer | undefined {
    return this.tokenizers.get(name);
  }

  /** Get a tokenizer by model name (e.g., "gpt-4", "gpt-4o", "claude-3-opus") */
  getByModel(model: string): Tokenizer | undefined {
    return this.modelMap.get(model.toLowerCase());
  }

  /** Get a tokenizer, trying name first then model. Falls back to fast-bpe. */
  resolve(nameOrModel: string): Tokenizer {
    return (
      this.getByName(nameOrModel) ??
      this.getByModel(nameOrModel) ??
      this.tokenizers.get("fast-bpe")!
    );
  }

  /** List all registered tokenizer names */
  list(): string[] {
    return Array.from(this.tokenizers.keys());
  }
}

/** Default singleton registry */
let defaultRegistry: TokenizerRegistry | null = null;

export function getDefaultTokenizerRegistry(): TokenizerRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new TokenizerRegistry();
  }
  return defaultRegistry;
}
