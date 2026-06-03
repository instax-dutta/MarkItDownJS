import { describe, it, expect } from 'vitest';
import {
  createNode,
  isNodeOfType,
  walkAst,
  getNodeText,
  countTokens,
  findNodesOfType,
  detectMimeType,
  isSupportedExtension,
  generateId,
  readInputData,
} from '../index.js';
import type { TextNode, HeadingNode, DocumentNode, ParagraphNode } from '../index.js';

describe('Document AST', () => {
  describe('createNode', () => {
    it('should create a text node', () => {
      const node = createNode<TextNode>({ type: 'text', value: 'hello' });
      expect(node.type).toBe('text');
      expect(node.value).toBe('hello');
    });

    it('should create a heading node', () => {
      const node = createNode<HeadingNode>({
        type: 'heading',
        level: 1,
        children: [createNode<TextNode>({ type: 'text', value: 'Title' })],
      });
      expect(node.type).toBe('heading');
      expect(node.level).toBe(1);
    });
  });

  describe('isNodeOfType', () => {
    it('should correctly identify node types', () => {
      const text = createNode<TextNode>({ type: 'text', value: 'test' });
      expect(isNodeOfType(text, 'text')).toBe(true);
      expect(isNodeOfType(text, 'heading')).toBe(false);
    });
  });

  describe('walkAst', () => {
    it('should visit all nodes', () => {
      const doc = createNode<DocumentNode>({
        type: 'document',
        children: [
          createNode<ParagraphNode>({
            type: 'paragraph',
            children: [createNode<TextNode>({ type: 'text', value: 'hello' })],
          }),
        ],
      });
      const visited: string[] = [];
      walkAst(doc, (node) => { visited.push(node.type); });
      expect(visited).toContain('document');
      expect(visited).toContain('paragraph');
      expect(visited).toContain('text');
    });
  });

  describe('getNodeText', () => {
    it('should extract text from text node', () => {
      const node = createNode<TextNode>({ type: 'text', value: 'hello world' });
      expect(getNodeText(node)).toBe('hello world');
    });

    it('should extract text from nested nodes', () => {
      const doc = createNode<DocumentNode>({
        type: 'document',
        children: [
          createNode<ParagraphNode>({
            type: 'paragraph',
            children: [
              createNode<TextNode>({ type: 'text', value: 'hello ' }),
              createNode<TextNode>({ type: 'text', value: 'world' }),
            ],
          }),
        ],
      });
      expect(getNodeText(doc)).toBe('hello world');
    });
  });

  describe('countTokens', () => {
    it('should count words', () => {
      const node = createNode<TextNode>({ type: 'text', value: 'hello world foo bar' });
      expect(countTokens(node)).toBe(4);
    });
  });

  describe('findNodesOfType', () => {
    it('should find all headings', () => {
      const doc = createNode<DocumentNode>({
        type: 'document',
        children: [
          createNode<HeadingNode>({ type: 'heading', level: 1, children: [] }),
          createNode<ParagraphNode>({ type: 'paragraph', children: [] }),
          createNode<HeadingNode>({ type: 'heading', level: 2, children: [] }),
        ],
      });
      const headings = findNodesOfType(doc, 'heading');
      expect(headings).toHaveLength(2);
    });
  });
});

describe('MIME types', () => {
  it('should detect PDF mime type', () => {
    expect(detectMimeType('document.pdf')).toBe('application/pdf');
  });

  it('should detect DOCX mime type', () => {
    expect(detectMimeType('report.docx')).toContain('wordprocessingml');
  });

  it('should support .html extension', () => {
    expect(isSupportedExtension('.html')).toBe(true);
  });
});

describe('Utilities', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should read string input', async () => {
    const data = await readInputData('hello');
    expect(data).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(data)).toBe('hello');
  });

  it('should read Uint8Array input', async () => {
    const input = new Uint8Array([1, 2, 3]);
    const data = await readInputData(input);
    expect(data).toBe(input);
  });
});
