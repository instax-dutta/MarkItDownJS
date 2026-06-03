import {
  AnyNode,
  DocumentNode,
  HeadingNode,
  HeadingInfo,
  walkAst,
  getNodeText,
  findNodesOfType,
  countTokens as sharedCountTokens,
} from '@markitdownjs/shared';

export type { HeadingInfo } from '@markitdownjs/shared';

export function extractText(node: AnyNode): string {
  return getNodeText(node);
}

export function extractHeadings(node: AnyNode): HeadingInfo[] {
  const headings = findNodesOfType<HeadingNode>(node, 'heading');
  return headings.map((h) => ({
    level: h.level,
    text: getNodeText(h),
    id: h.id,
  }));
}

export function countTokens(node: AnyNode): number {
  return sharedCountTokens(node);
}

export function findNodeById(node: AnyNode, id: string): AnyNode | null {
  let found: AnyNode | null = null;
  walkAst(node, (n) => {
    if ('id' in n && n.id === id) {
      found = n;
      return false;
    }
    return undefined;
  });
  return found;
}

export function getDepth(node: AnyNode): number {
  let maxDepth = 0;
  const visit = (n: AnyNode, depth: number): void => {
    if (depth > maxDepth) maxDepth = depth;
    if ('children' in n && Array.isArray(n.children)) {
      for (const child of n.children) {
        visit(child, depth + 1);
      }
    }
  };
  visit(node, 0);
  return maxDepth;
}

export function flattenChildren(node: AnyNode): AnyNode[] {
  const result: AnyNode[] = [];
  walkAst(node, (n) => {
    if (n !== node) result.push(n);
  });
  return result;
}

export function mergeDocuments(...nodes: DocumentNode[]): DocumentNode {
  const children: AnyNode[] = [];
  for (const doc of nodes) {
    if (doc.children) {
      children.push(...doc.children);
    }
  }
  return {
    type: 'document',
    children,
  };
}
