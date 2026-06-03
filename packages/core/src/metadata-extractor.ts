import type { DocumentMetadata } from "@markitdownjs/shared";

export class MetadataExtractor {
  extractFromMarkdown(markdown: string): DocumentMetadata {
    const metadata: DocumentMetadata = {};

    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch?.[1]) {
      metadata.title = titleMatch[1].trim();
    }

    const words = markdown
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[#*_`\[\]()!]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 0);
    metadata.wordCount = words.length;

    return metadata;
  }

  extractFromAST(ast: unknown): DocumentMetadata {
    const metadata: DocumentMetadata = {};
    if (ast && typeof ast === "object" && "metadata" in ast) {
      const nodeAst = ast as { metadata?: Record<string, unknown> };
      if (nodeAst.metadata) {
        Object.assign(metadata, nodeAst.metadata);
      }
    }
    return metadata;
  }

  merge(a: DocumentMetadata, b: DocumentMetadata): DocumentMetadata {
    return {
      ...a,
      ...b,
      customProperties: {
        ...a.customProperties,
        ...b.customProperties,
      },
    };
  }
}
