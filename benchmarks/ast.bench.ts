import { describe, bench } from 'vitest';
import { MarkdownRenderer, HtmlRenderer, PlainTextRenderer, JsonRenderer } from '../packages/ast/dist/index.js';
import { createNode, walkAst, getNodeText, countTokens } from '../packages/shared/dist/index.js';
import type { DocumentNode, HeadingNode, ParagraphNode, TextNode, TableNode, TableRowNode, TableCellNode } from '../packages/shared/dist/index.js';

// Build a large test AST
function buildLargeAst(): DocumentNode {
  const children = [];
  for (let i = 0; i < 100; i++) {
    children.push(
      createNode<HeadingNode>({
        type: 'heading',
        level: (i % 6 + 1) as 1 | 2 | 3 | 4 | 5 | 6,
        children: [createNode<TextNode>({ type: 'text', value: `Heading ${i}` })],
      })
    );
    children.push(
      createNode<ParagraphNode>({
        type: 'paragraph',
        children: [createNode<TextNode>({
          type: 'text',
          value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10),
        })],
      })
    );
    if (i % 10 === 0) {
      children.push(
        createNode<TableNode>({
          type: 'table',
          children: Array.from({ length: 20 }, (_, r) =>
            createNode<TableRowNode>({
              type: 'table-row',
              isHeader: r === 0,
              children: Array.from({ length: 5 }, (_, c) =>
                createNode<TableCellNode>({
                  type: 'table-cell',
                  children: [createNode<TextNode>({ type: 'text', value: `Cell ${r}-${c}` })],
                })
              ),
            })
          ),
        })
      );
    }
  }
  return createNode<DocumentNode>({ type: 'document', children });
}

const largeAst = buildLargeAst();

describe('AST Rendering Performance', () => {
  const mdRenderer = new MarkdownRenderer();
  const htmlRenderer = new HtmlRenderer();
  const textRenderer = new PlainTextRenderer();
  const jsonRenderer = new JsonRenderer();

  bench('MarkdownRenderer.render', () => {
    mdRenderer.render(largeAst);
  });

  bench('HtmlRenderer.render', () => {
    htmlRenderer.render(largeAst);
  });

  bench('PlainTextRenderer.render', () => {
    textRenderer.render(largeAst);
  });

  bench('JsonRenderer.render', () => {
    jsonRenderer.render(largeAst);
  });
});

describe('AST Utility Performance', () => {
  bench('walkAst', () => {
    walkAst(largeAst, () => {});
  });

  bench('getNodeText', () => {
    getNodeText(largeAst);
  });

  bench('countTokens', () => {
    countTokens(largeAst);
  });
});
