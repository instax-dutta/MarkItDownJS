import { describe, it, expect } from 'vitest';
import { DocumentChunker } from '../chunker.js';
import { createNode } from '@markitdownjs/shared';
import type { DocumentNode, HeadingNode, ParagraphNode, TextNode } from '@markitdownjs/shared';

describe('DocumentChunker', () => {
  const chunker = new DocumentChunker();

  const ast = createNode<DocumentNode>({
    type: 'document',
    children: [
      createNode<HeadingNode>({
        type: 'heading',
        level: 1,
        children: [createNode<TextNode>({ type: 'text', value: 'Introduction' })],
      }),
      createNode<ParagraphNode>({
        type: 'paragraph',
        children: [createNode<TextNode>({ type: 'text', value: 'This is the introduction paragraph.' })],
      }),
      createNode<HeadingNode>({
        type: 'heading',
        level: 1,
        children: [createNode<TextNode>({ type: 'text', value: 'Main Content' })],
      }),
      createNode<ParagraphNode>({
        type: 'paragraph',
        children: [createNode<TextNode>({ type: 'text', value: 'This is the main content.' })],
      }),
    ],
  });

  it('should chunk by heading', () => {
    const chunks = chunker.chunk(ast, { strategy: 'heading' });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]!.metadata.headingPath).toContain('Introduction');
  });

  it('should chunk by fixed size', () => {
    const chunks = chunker.chunk(ast, { strategy: 'fixed', maxTokens: 5, overlap: 2 });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('should generate chunk IDs', () => {
    const chunks = chunker.chunk(ast, { strategy: 'heading' });
    for (const chunk of chunks) {
      expect(chunk.id).toBeDefined();
      expect(chunk.id.length).toBeGreaterThan(0);
    }
  });
});
