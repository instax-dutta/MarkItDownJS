import type { AnyNode } from "./document-ast.js";

export type MimeType = string;
export type FileExtension = string;
export type ConverterId = string;

/** Standardized document metadata schema */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: string;
  modifiedAt?: string;
  pages?: number;
  language?: string;
  format?: string;
  source?: string;
  description?: string;
  subject?: string;
  keywords?: string[];
  wordCount?: number;
  characterCount?: number;
  pageCount?: number;
  /** @deprecated Use createdAt instead */
  createdDate?: Date;
  /** @deprecated Use modifiedAt instead */
  modifiedDate?: Date;
  customProperties?: Record<string, unknown>;
}

/** Chunk metadata for RAG workflows */
export interface ChunkMetadata {
  chunkId: string;
  page?: number;
  headingPath: string[];
  tokenCount: number;
  sourceFile?: string;
  startIndex: number;
  endIndex: number;
  /** Content type classification for embedding strategy selection */
  contentType?: "narrative" | "table" | "code" | "list" | "callout" | "heading-only" | "mixed";
  /** Overlap range metadata for deduplication */
  overlapStart?: number;
  overlapEnd?: number;
}

/** Document chunk for RAG */
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  ast: AnyNode;
}

/** Chunking configuration */
export interface ChunkingOptions {
  enabled?: boolean;
  strategy?: "heading" | "page" | "semantic" | "fixed";
  maxTokens?: number;
  overlap?: number;
  overlapMode?: "tokens" | "sentences";
  headingDepth?: number;
  sourceFile?: string;
  /** Tokenizer name or model name for accurate token counting (e.g., "cl100k_base", "gpt-4o") */
  tokenizer?: string;
  /** Custom tokenizer function — overrides the tokenizer registry lookup */
  tokenizerFn?: (text: string) => number;
}

export interface ConversionInput {
  data: Uint8Array | ArrayBuffer | Blob | string;
  mimeType?: MimeType;
  fileName?: string;
  options?: ConversionOptions;
}

export interface ConversionOptions {
  outputFormat?: OutputFormat;
  includeMetadata?: boolean;
  includeImages?: boolean;
  includeTables?: boolean;
  maxTokens?: number;
  customProperties?: Record<string, unknown>;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  /** Chunking configuration for RAG workflows */
  chunking?: ChunkingOptions;
  /** Custom page break marker rendered between PDF pages (default: "---"). */
  pageBreakMarker?: string;
  /** Prepend YAML frontmatter with title/author/pages to PDF output. */
  injectFrontmatter?: boolean;
  /** Override heading size ratio thresholds for PDF heading classification. */
  headingSizeRatios?: { h1?: number; h2?: number; h3?: number };
}

export type OutputFormat = "markdown" | "json" | "plaintext" | "html";

export interface ConversionResult {
  markdown: string;
  metadata: DocumentMetadata;
  assets: AssetInfo[];
  tables: TableData[];
  images: ImageInfo[];
  headings: HeadingInfo[];
  ast?: AnyNode;
  format: OutputFormat;
  converterId: ConverterId;
  stats: ConversionStats;
  /** Document chunks for RAG workflows (only populated when chunking is enabled) */
  chunks?: DocumentChunk[];
  /** Warnings emitted during conversion (non-fatal issues) */
  warnings?: ConversionWarning[];
}

export interface AssetInfo {
  id: string;
  type: "image" | "font" | "stylesheet" | "other";
  data?: Uint8Array;
  mimeType: string;
  fileName?: string;
  url?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface ImageInfo {
  id: string;
  data?: Uint8Array;
  mimeType: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface HeadingInfo {
  level: number;
  text: string;
  id?: string;
}

export interface ConversionStats {
  startTime: number;
  endTime: number;
  duration: number;
  inputSize: number;
  outputSize: number;
  pagesProcessed?: number;
  chunksProcessed?: number;
}

/** Warning emitted during conversion when a converter encounters non-fatal issues */
export interface ConversionWarning {
  converter: string;
  message: string;
  severity: "info" | "warning" | "error";
}

export type ProgressCallback = (progress: ProgressInfo) => void;

export interface ProgressInfo {
  phase: "parsing" | "converting" | "rendering" | "chunking";
  percentage: number;
  message?: string;
}

export interface Converter {
  readonly id: ConverterId;
  readonly supportedMimeTypes: MimeType[];
  readonly supportedExtensions: FileExtension[];
  canConvert(input: ConversionInput): Promise<boolean>;
  convert(input: ConversionInput): Promise<ConversionResult>;
}

export interface Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  converters?: Converter[];
  middleware?: ConversionMiddleware[];
  initialize?(context: PluginContext): Promise<void>;
  destroy?(): Promise<void>;
}

export interface PluginContext {
  registry: ConverterRegistry;
  logger: Logger;
  config: Record<string, unknown>;
}

export interface ConversionMiddleware {
  name: string;
  priority: number;
  beforeConvert?(input: ConversionInput): Promise<ConversionInput>;
  afterConvert?(result: ConversionResult): Promise<ConversionResult>;
}

export interface ConverterRegistry {
  register(converter: Converter): void;
  unregister(id: ConverterId): void;
  get(id: ConverterId): Converter | undefined;
  getByMimeType(mimeType: MimeType): Converter | undefined;
  getByExtension(extension: FileExtension): Converter | undefined;
  list(): Converter[];
  canConvert(input: ConversionInput): Promise<Converter | undefined>;
  getMiddlewares(): ConversionMiddleware[];
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
