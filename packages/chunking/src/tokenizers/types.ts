/** Tokenizer interface for accurate token counting across different LLM models */
export interface Tokenizer {
  /** Human-readable name (e.g., "cl100k_base", "o200k_base") */
  readonly name: string;
  /** Model families this tokenizer supports */
  readonly models: string[];
  /** Encode text into token IDs */
  encode(text: string): number[];
  /** Decode token IDs back to text */
  decode(tokens: number[]): string;
  /** Count tokens in text (fast path, no need to materialize IDs) */
  countTokens(text: string): number;
}
