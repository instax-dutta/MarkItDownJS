import {
  AnyNode,
  HeadingNode,
  ParagraphNode,
  TextNode,
  EmphasisNode,
  StrongNode,
  InlineCodeNode,
  CodeNode,
  LinkNode,
  ImageNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  BlockquoteNode,
  HtmlNode,
  FootnoteNode,
  SectionNode,
  StrikethroughNode,
  MathNode,
  RawNode,
  getNodeText,
} from '@markitdownjs/shared';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class HtmlRenderer {
  render(node: AnyNode): string {
    switch (node.type) {
      case 'document': {
        const children = node.children ?? [];
        return '<div>' + children.map((c) => this.render(c)).join('\n') + '</div>';
      }
      case 'heading': {
        const heading = node as HeadingNode;
        const tag = `h${heading.level}`;
        const id = heading.id ? ` id="${heading.id}"` : '';
        const children = heading.children.map((c) => this.render(c)).join('');
        return `<${tag}${id}>${children}</${tag}>`;
      }
      case 'paragraph': {
        const paragraph = node as ParagraphNode;
        const children = paragraph.children.map((c) => this.render(c)).join('');
        return `<p>${children}</p>`;
      }
      case 'text': {
        return escapeHtml((node as TextNode).value);
      }
      case 'emphasis': {
        const emphasis = node as EmphasisNode;
        const children = emphasis.children.map((c) => this.render(c)).join('');
        return `<em>${children}</em>`;
      }
      case 'strong': {
        const strong = node as StrongNode;
        const children = strong.children.map((c) => this.render(c)).join('');
        return `<strong>${children}</strong>`;
      }
      case 'inline-code': {
        return `<code>${escapeHtml((node as InlineCodeNode).value)}</code>`;
      }
      case 'code': {
        const code = node as CodeNode;
        const lang = code.language ? ` class="language-${code.language}"` : '';
        return `<pre><code${lang}>${escapeHtml(code.value)}</code></pre>`;
      }
      case 'link': {
        const link = node as LinkNode;
        const children = link.children.map((c) => this.render(c)).join('');
        const title = link.title ? ` title="${escapeHtml(link.title)}"` : '';
        return `<a href="${escapeHtml(link.href)}"${title}>${children}</a>`;
      }
      case 'image': {
        const image = node as ImageNode;
        const alt = image.alt ? ` alt="${escapeHtml(image.alt)}"` : '';
        const title = image.title ? ` title="${escapeHtml(image.title)}"` : '';
        return `<img src="${escapeHtml(image.src)}"${alt}${title} />`;
      }
      case 'list': {
        const list = node as ListNode;
        const tag = list.ordered ? 'ol' : 'ul';
        const children = list.children.map((c) => this.render(c)).join('\n');
        return `<${tag}>\n${children}\n</${tag}>`;
      }
      case 'list-item': {
        const listItem = node as ListItemNode;
        const children = listItem.children.map((c) => this.render(c)).join('');
        return `<li>${children}</li>`;
      }
      case 'table': {
        return this.renderTable(node as TableNode);
      }
      case 'table-row': {
        const row = node as TableRowNode;
        const tag = row.isHeader ? 'th' : 'td';
        const cells = row.children.map((c) => {
          const content = c.children.map((cc) => this.render(cc)).join('');
          return `<${tag}>${content}</${tag}>`;
        });
        return `<tr>\n${cells.join('\n')}\n</tr>`;
      }
      case 'table-cell': {
        const cell = node as TableCellNode;
        return cell.children.map((c) => this.render(c)).join('');
      }
      case 'blockquote': {
        const blockquote = node as BlockquoteNode;
        const children = blockquote.children.map((c) => this.render(c)).join('\n');
        return `<blockquote>\n${children}\n</blockquote>`;
      }
      case 'thematic-break':
      case 'horizontal-rule':
        return '<hr />';
      case 'html': {
        return (node as HtmlNode).value;
      }
      case 'footnote': {
        const footnote = node as FootnoteNode;
        const id = footnote.identifier;
        return `<sup><a href="#fn-${id}">${id}</a></sup>`;
      }
      case 'page-break':
        return '<div class="page-break"></div>';
      case 'section': {
        const section = node as SectionNode;
        const children = section.children.map((c) => this.render(c)).join('\n');
        return `<section>\n${children}\n</section>`;
      }
      case 'strikethrough': {
        const strikethrough = node as StrikethroughNode;
        const children = strikethrough.children.map((c) => this.render(c)).join('');
        return `<del>${children}</del>`;
      }
      case 'math': {
        const math = node as MathNode;
        return `<span class="math">${escapeHtml(math.value)}</span>`;
      }
      case 'raw': {
        return (node as RawNode).value;
      }
      case 'definition':
      case 'quote':
      case 'subscript':
      case 'superscript': {
        return escapeHtml(getNodeText(node));
      }
      default:
        return '';
    }
  }

  private renderTable(table: TableNode): string {
    const rows = table.children;
    if (rows.length === 0) return '';

    let hasHeader = false;
    const bodyRows: TableRowNode[] = [];
    for (const row of rows) {
      if (row.isHeader) {
        hasHeader = true;
      } else {
        bodyRows.push(row);
      }
    }

    const renderRow = (row: TableRowNode): string => {
      return '<tr>\n' + row.children.map((c) => this.render(c)).join('\n') + '\n</tr>';
    };

    let html = '<table>\n';
    if (hasHeader) {
      const headerRow = rows.find((r) => r.isHeader);
      if (headerRow) {
        html += '<thead>\n' + renderRow(headerRow) + '\n</thead>\n';
      }
    }
    html += '<tbody>\n';
    for (const row of bodyRows) {
      html += renderRow(row) + '\n';
    }
    html += '</tbody>\n</table>';
    return html;
  }
}
