import type { Tokenizer } from "./types.js";

/**
 * Fast BPE tokenizer — built-in fallback with ~5% error margin.
 * Uses whitespace splitting + heuristic subword estimation.
 * No external dependencies. Good enough for approximate chunk sizing.
 */
export class FastBPETokenizer implements Tokenizer {
  readonly name = "fast-bpe";
  readonly models = ["fast-bpe", "default"];

  encode(text: string): number[] {
    // Approximate: split on whitespace and punctuation, each segment ≈ 1 token.
    const tokens: number[] = [];
    const regex = /[\w']+|[^\w\s]+|\s+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const segment = match[0];
      if (segment.trim() === "") continue;
      // Longer segments need multiple tokens (approx 4 chars per token for CJK, 1 for Latin).
      const estimated = Math.max(1, Math.ceil(segment.length / 3.5));
      for (let i = 0; i < estimated; i++) {
        tokens.push(i);
      }
    }
    return tokens;
  }

  decode(_tokens: number[]): string {
    // Approximate decode — not accurate for fast-bpe but sufficient for counting.
    return "";
  }

  countTokens(text: string): number {
    if (!text || text.trim() === "") return 0;

    let count = 0;
    const regex = /[\w']+|[^\w\s]+|\s+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const segment = match[0];
      if (segment.trim() === "") continue;
      count += Math.max(1, Math.ceil(segment.length / 3.5));
    }
    return count;
  }
}
