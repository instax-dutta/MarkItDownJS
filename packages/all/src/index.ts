// Core
export { MarkItDown } from "@markitdownjs/core";
export type { MarkItDownOptions } from "@markitdownjs/core";
export { DefaultConverterRegistry, DocumentPipeline, MarkdownRenderer } from "@markitdownjs/core";
export { MetadataExtractor, AssetManager } from "@markitdownjs/core";

// Shared types and utilities
export type * from "@markitdownjs/shared";
export {
  extensionToMime,
  mimeToExtension,
  detectMimeType,
  isSupportedExtension,
  isSupportedMimeType,
  getSupportedExtensions,
  getSupportedMimeTypes,
  MarkItDownError,
  UnsupportedFormatError,
  ConversionError,
  FileReadError,
  ParseError,
  PluginError,
  CancellationError,
  uint8ArrayToDataUrl,
  blobToUint8Array,
  readInputData,
  detectMimeTypeFromData,
  detectMimeTypeFromBuffer,
  truncateText,
  generateId,
  mergeOptions,
  AbortError,
  checkSignal,
  parseHTML,
  parseXML,
  serializeXML,
  strictCanConvert,
  isZipMagic,
  checkZipBombRisk,
} from "@markitdownjs/shared";

// AST renderers
export {
  MarkdownRenderer as AstMarkdownRenderer,
  HtmlRenderer,
  PlainTextRenderer,
  JsonRenderer,
} from "@markitdownjs/ast";

// AST utilities
export {
  extractText,
  extractHeadings,
  countTokens as astCountTokens,
  findNodeById,
  getDepth,
  flattenChildren,
  mergeDocuments,
} from "@markitdownjs/ast";
export type { HeadingInfo } from "@markitdownjs/ast";

// Converters
export { PdfConverter } from "@markitdownjs/pdf";
export { DocxConverter } from "@markitdownjs/docx";
export { XlsxConverter } from "@markitdownjs/xlsx";
export { PptxConverter } from "@markitdownjs/pptx";
export { HtmlConverter } from "@markitdownjs/html";
export { CsvConverter } from "@markitdownjs/csv";
export { JsonConverter } from "@markitdownjs/json";
export { XmlConverter } from "@markitdownjs/xml";
export { EpubConverter } from "@markitdownjs/epub";
export { AudioConverter } from "@markitdownjs/audio";
export { ImageOcrConverter } from "@markitdownjs/image-ocr";
export { ArchiveConverter } from "@markitdownjs/archive";

// Chunking
export {
  DocumentChunker,
  HeadingChunkingStrategy,
  PageChunkingStrategy,
  SemanticChunkingStrategy,
  FixedChunkingStrategy,
  classifyChunkContentType,
  classifyChunks,
  computeContentHash,
  computeStructureHash,
  fingerprintChunks,
  detectChangedChunks,
} from "@markitdownjs/chunking";
export type {
  ChunkingStrategy,
  ContentType,
  ChunkFingerprint,
  Tokenizer,
} from "@markitdownjs/chunking";

// React
export {
  MarkItDownProvider,
  useMarkItDown,
  DocumentDropzone,
  DocumentPreview,
  MarkdownViewer,
  ConversionProgress,
  useDocumentParser,
  useMarkdownConversion,
} from "@markitdownjs/react";
export type {
  DocumentDropzoneProps,
  DocumentPreviewProps,
  MarkdownViewerProps,
  ConversionProgressProps,
  MarkItDownProviderProps,
} from "@markitdownjs/react";

// Next.js
export {
  createConvertRoute,
  convertDocumentAction,
  formatsRoute,
  convertRoute,
  batchRoute,
  handleFileUpload,
  validateFile,
} from "@markitdownjs/next";

// API
export { app, rateLimit, validateFileSize } from "@markitdownjs/api";

// Pack
export { pack, unpack } from "@markitdownjs/pack";
export type { PackBundle, PackManifest, PackOptions, PackCompression } from "@markitdownjs/pack";

// Optimizer
export { Optimizer, BUILTIN_RULES } from "@markitdownjs/optimizer";
export type { OptimizerConfig, OptimizerRule } from "@markitdownjs/optimizer";

// Preset factory
export { createMarkItDown } from "./preset.js";
