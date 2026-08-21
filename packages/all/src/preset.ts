import { MarkItDown } from "@markitdownjs/core";
import { DocumentChunker } from "@markitdownjs/chunking";

import { PdfConverter } from "@markitdownjs/pdf";
import { DocxConverter } from "@markitdownjs/docx";
import { XlsxConverter } from "@markitdownjs/xlsx";
import { PptxConverter } from "@markitdownjs/pptx";
import { HtmlConverter } from "@markitdownjs/html";
import { CsvConverter } from "@markitdownjs/csv";
import { JsonConverter } from "@markitdownjs/json";
import { XmlConverter } from "@markitdownjs/xml";
import { EpubConverter } from "@markitdownjs/epub";
import { AudioConverter } from "@markitdownjs/audio";
import { ImageOcrConverter } from "@markitdownjs/image-ocr";
import { ArchiveConverter } from "@markitdownjs/archive";

/**
 * Create a pre-configured MarkItDown instance with all converters and
 * the document chunker registered.
 *
 * @example
 * ```typescript
 * import { createMarkItDown } from "@markitdownjs/all";
 *
 * const md = createMarkItDown();
 * // Pass file bytes with a filename (or a File/Blob), not a path string.
 * const result = await md.convert({ data: fileBytes, fileName: "document.pdf" });
 * console.log(result.markdown);
 * ```
 */
export function createMarkItDown(): MarkItDown {
  const md = new MarkItDown();

  // Register all available converters
  md.registerConverter(new PdfConverter());
  md.registerConverter(new DocxConverter());
  md.registerConverter(new XlsxConverter());
  md.registerConverter(new PptxConverter());
  md.registerConverter(new HtmlConverter());
  md.registerConverter(new CsvConverter());
  md.registerConverter(new JsonConverter());
  md.registerConverter(new XmlConverter());
  md.registerConverter(new EpubConverter());
  md.registerConverter(new AudioConverter());
  md.registerConverter(new ImageOcrConverter());
  md.registerConverter(new ArchiveConverter());

  // Register the chunker for RAG workflows
  md.registerChunker(new DocumentChunker());

  return md;
}
