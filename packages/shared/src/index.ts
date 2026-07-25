export type {
  MimeType,
  FileExtension,
  ConverterId,
  ConversionInput,
  ConversionOptions,
  OutputFormat,
  ConversionResult,
  DocumentMetadata,
  AssetInfo,
  TableData,
  ImageInfo,
  HeadingInfo,
  ConversionStats,
  ConversionWarning,
  ProgressCallback,
  ProgressInfo,
  Converter,
  Plugin,
  PluginContext,
  ConversionMiddleware,
  ConverterRegistry,
  Logger,
  ChunkMetadata,
  DocumentChunk,
  ChunkingOptions,
} from "./types.js";

export type {
  NodeType,
  NodePosition,
  DocumentNode,
  HeadingNode,
  ParagraphNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  ListNode,
  ListItemNode,
  ImageNode,
  LinkNode,
  CodeNode,
  QuoteNode,
  BlockquoteNode,
  TextNode,
  EmphasisNode,
  StrongNode,
  InlineCodeNode,
  ThematicBreakNode,
  HtmlNode,
  DefinitionNode,
  FootnoteNode,
  PageBreakNode,
  SectionNode,
  StrikethroughNode,
  MathNode,
  HorizontalRuleNode,
  RawNode,
  CalloutNode,
  AnyNode,
} from "./document-ast.js";

export {
  createNode,
  isNodeOfType,
  walkAst,
  getNodeText,
  countTokens,
  findNodesOfType,
} from "./document-ast.js";

export {
  extensionToMime,
  mimeToExtension,
  detectMimeType,
  isSupportedExtension,
  isSupportedMimeType,
  getSupportedExtensions,
  getSupportedMimeTypes,
} from "./mime-types.js";

export {
  MarkItDownError,
  UnsupportedFormatError,
  ConversionError,
  FileReadError,
  ParseError,
  PluginError,
  CancellationError,
} from "./errors.js";

export {
  uint8ArrayToDataUrl,
  blobToUint8Array,
  readInputData,
  detectMimeTypeFromData,
  truncateText,
  generateId,
  mergeOptions,
  AbortError,
  checkSignal,
} from "./utils.js";

export { parseHTML, parseXML, serializeXML } from "./dom.js";

export { strictCanConvert, isZipMagic, checkZipBombRisk } from "./converter-utils.js";
export type { StrictCanConvertOptions } from "./converter-utils.js";
