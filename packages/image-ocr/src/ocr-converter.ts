import type {
  Converter,
  ConversionInput,
  ConversionResult,
  ConversionStats,
  DocumentMetadata,
} from "@markitdownjs/shared";
import {
  createNode,
  readInputData,
  detectMimeTypeFromData,
  generateId,
  type AnyNode,
  type DocumentNode,
  type ImageNode,
  type ParagraphNode,
  type TextNode,
  type HeadingNode,
  type CodeNode,
} from "@markitdownjs/shared";

/** Magic byte signatures for additional image format detection. */
const IMAGE_SIGNATURES: { bytes: number[]; mime: string }[] = [
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },        // PNG
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },              // JPEG
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },       // RIFF (WebP)
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: "image/gif" },        // GIF8
  { bytes: [0x42, 0x4d], mime: "image/bmp" },                     // BMP
  { bytes: [0x49, 0x49, 0x2a, 0x00], mime: "image/tiff" },       // TIFF (little-endian)
  { bytes: [0x4d, 0x4d, 0x00, 0x2a], mime: "image/tiff" },       // TIFF (big-endian)
  { bytes: [0x00, 0x00, 0x01, 0x00], mime: "image/x-icon" },     // ICO
  { bytes: [0x38, 0x50, 0x53, 0x00], mime: "image/vnd.adobe.photoshop" }, // PSD
];

/**
 * Converts a Uint8Array to a base64 string safely, without stack overflow.
 *
 * The naive approach `btoa(String.fromCharCode(...data))` fails for arrays
 * larger than ~64K elements due to JavaScript's maximum call stack size.
 * This function processes data in 8KB chunks to avoid the issue.
 *
 * @param data - The byte array to encode
 * @returns A base64-encoded string
 */
function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Detects the MIME type of an image from its binary data using magic byte signatures.
 * Falls back to the shared `detectMimeTypeFromData` utility.
 *
 * @param data - The raw image bytes
 * @returns The detected MIME type, or undefined if unrecognized
 */
function detectImageMimeType(data: Uint8Array): string | undefined {
  if (data.length < 2) return undefined;

  for (const sig of IMAGE_SIGNATURES) {
    if (data.length >= sig.bytes.length) {
      const match = sig.bytes.every((byte, idx) => data[idx] === byte);
      if (match) return sig.mime;
    }
  }

  return detectMimeTypeFromData(data);
}

/**
 * Attempts to extract image dimensions from the raw bytes.
 * Supports PNG (IHDR chunk) and JPEG (SOF marker) formats.
 *
 * @param data - The raw image bytes
 * @param mimeType - The detected MIME type
 * @returns An object with width and height, or undefined if unable to parse
 */
function extractImageDimensions(
  data: Uint8Array,
  mimeType: string
): { width: number; height: number } | undefined {
  try {
    if (mimeType === "image/png" && data.length >= 24) {
      // PNG: width at offset 16 (4 bytes BE), height at offset 20 (4 bytes BE)
      const width = (data[16]! << 24) | (data[17]! << 16) | (data[18]! << 8) | data[19]!;
      const height = (data[20]! << 24) | (data[21]! << 16) | (data[22]! << 8) | data[23]!;
      if (width > 0 && height > 0) return { width, height };
    }

    if (mimeType === "image/jpeg" && data.length >= 4) {
      // JPEG: scan for SOF0 (0xC0) or SOF2 (0xC2) marker
      let offset = 2;
      while (offset < data.length - 9) {
        if (data[offset] !== 0xff) break;
        const marker = data[offset + 1]!;
        if (marker === 0xc0 || marker === 0xc2) {
          const height = (data[offset + 5]! << 8) | data[offset + 6]!;
          const width = (data[offset + 7]! << 8) | data[offset + 8]!;
          if (width > 0 && height > 0) return { width, height };
        }
        // Skip to next marker
        const segmentLength = (data[offset + 2]! << 8) | data[offset + 3]!;
        offset += 2 + segmentLength;
      }
    }

    if (mimeType === "image/gif" && data.length >= 10) {
      // GIF: width at offset 6 (2 bytes LE), height at offset 8 (2 bytes LE)
      const width = data[6]! | (data[7]! << 8);
      const height = data[8]! | (data[9]! << 8);
      if (width > 0 && height > 0) return { width, height };
    }

    if (mimeType === "image/bmp" && data.length >= 26) {
      // BMP: width at offset 18 (4 bytes LE), height at offset 22 (4 bytes LE)
      const width = data[18]! | (data[19]! << 8) | (data[20]! << 16) | (data[21]! << 24);
      const height = data[22]! | (data[23]! << 8) | (data[24]! << 16) | (data[25]! << 24);
      if (width > 0 && height > 0) return { width, height: Math.abs(height) };
    }
  } catch {
    // Dimension extraction is best-effort; don't fail conversion
  }

  return undefined;
}

/**
 * Renders an array of AST nodes into a Markdown string.
 * This is the local renderMarkdown helper for the image-ocr converter.
 *
 * @param nodes - The AST nodes to render
 * @returns The rendered Markdown string
 */
function renderMarkdown(nodes: AnyNode[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    parts.push(renderNode(node));
  }
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Renders a single AST node into its Markdown representation.
 *
 * @param node - The AST node to render
 * @returns The Markdown string for this node
 */
function renderNode(node: AnyNode): string {
  switch (node.type) {
    case "heading": {
      const n = node as HeadingNode;
      return `${"#".repeat(n.level)} ${renderNodes(n.children)}`;
    }
    case "paragraph": {
      return renderNodes((node as ParagraphNode).children);
    }
    case "image": {
      const n = node as ImageNode;
      return `![${n.alt ?? ""}](${n.src}${n.title ? ` "${n.title}"` : ""})`;
    }
    case "code": {
      const n = node as CodeNode;
      return "```" + (n.language ?? "") + "\n" + n.value + "\n```";
    }
    case "text": {
      return (node as TextNode).value;
    }
    default:
      if ("children" in node && Array.isArray(node.children)) {
        return renderNodes(node.children);
      }
      return "";
  }
}

/**
 * Recursively renders an array of AST nodes into a single string.
 *
 * @param nodes - The AST nodes to render
 * @returns The concatenated rendered output
 */
function renderNodes(nodes: AnyNode[]): string {
  return nodes.map((n) => renderNode(n)).join("");
}

/**
 * Converts images to text using OCR (Optical Character Recognition).
 *
 * Features:
 * - Chunked base64 encoding to prevent stack overflow on large images
 * - Language selection (defaults to English, configurable)
 * - Image dimension extraction from PNG, JPEG, GIF, and BMP headers
 * - OCR confidence score from tesseract.js (when available)
 * - Magic byte detection for additional image formats
 * - Comprehensive error messages when tesseract.js is not installed
 *
 * @example
 * ```ts
 * const converter = new ImageOcrConverter();
 * const result = await converter.convert({
 *   data: pngBuffer,
 *   options: { customProperties: { ocrLanguage: "fra" } }
 * });
 * console.log(result.ast);  // DocumentNode with image + extracted text
 * console.log(result.markdown);
 * ```
 */
export class ImageOcrConverter implements Converter {
  readonly id = "image-ocr";
  readonly supportedMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/tiff",
    "image/bmp",
    "image/gif",
  ];
  readonly supportedExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".tiff",
    ".tif",
    ".bmp",
    ".gif",
  ];

  /**
   * Checks whether this converter can handle the given input.
   * Validates MIME type, file extension, and magic byte signatures.
   *
   * @param input - The conversion input to check
   * @returns True if this converter can process the input
   */
  async canConvert(input: ConversionInput): Promise<boolean> {
    if (input.mimeType && this.supportedMimeTypes.includes(input.mimeType)) {
      return true;
    }

    if (input.fileName) {
      const ext = input.fileName
        .slice(input.fileName.lastIndexOf("."))
        .toLowerCase();
      if (this.supportedExtensions.includes(ext)) {
        return true;
      }
    }

    try {
      const data = await readInputData(input.data);
      const detected = detectImageMimeType(data);
      if (detected && this.supportedMimeTypes.includes(detected)) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  /**
   * Converts an image file into text via OCR, producing an AST with the image
   * node and the extracted text as a paragraph.
   *
   * @param input - The image data as Uint8Array, ArrayBuffer, Blob, or string
   * @returns A ConversionResult with the AST, Markdown, and image metadata
   */
  async convert(input: ConversionInput): Promise<ConversionResult> {
    const startTime = performance.now();
    const data = await readInputData(input.data);
    const mimeType =
      input.mimeType ?? detectImageMimeType(data) ?? "image/png";
    const imageId = generateId();

    // Extract image dimensions (best-effort, from raw bytes)
    const dimensions = extractImageDimensions(data, mimeType);

    // Determine OCR language from options (default: English)
    const ocrLanguage =
      input.options?.customProperties?.ocrLanguage as string | undefined ?? "eng";

    // Perform OCR
    let ocrText = "";
    let ocrConfidence: number | undefined;
    let ocrSuccess = false;

    try {
      const Tesseract = await import("tesseract.js");
      const blob = new Blob([new Uint8Array(data)], { type: mimeType });
      const result = await Tesseract.recognize(blob, ocrLanguage, {
        logger: undefined, // suppress verbose logging
      });

      ocrText = result.data.text.trim();
      ocrConfidence = result.data.confidence;
      ocrSuccess = ocrText.length > 0;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      if (
        errorMessage.includes("Cannot find module") ||
        errorMessage.includes("MODULE_NOT_FOUND") ||
        errorMessage.includes("tesseract")
      ) {
        ocrText =
          "[OCR unavailable: tesseract.js is not installed. " +
          "Install it with: npm install tesseract.js]";
      } else {
        ocrText = `[OCR failed: ${errorMessage}]`;
      }
    }

    // Build the base64 data URL (using safe chunked encoding)
    const base64 = uint8ArrayToBase64(new Uint8Array(data));
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Build the AST nodes
    const children: AnyNode[] = [];

    // Image node with dimension metadata
    const imageNode = createNode<ImageNode>({
      type: "image",
      src: dataUrl,
      alt: "OCR source image",
      data: new Uint8Array(data),
      mimeType,
      width: dimensions?.width,
      height: dimensions?.height,
    });
    children.push(imageNode);

    // OCR result paragraph with confidence metadata
    if (ocrText) {
      const textNode = createNode<TextNode>({
        type: "text",
        value: ocrText,
      });

      const paragraphNode = createNode<ParagraphNode>({
        type: "paragraph",
        children: [textNode],
        // Attach confidence as custom property
        confidence: ocrConfidence,
        ocrSuccess,
        ocrLanguage,
      });
      children.push(paragraphNode);
    }

    const documentNode = createNode<DocumentNode>({
      type: "document",
      children,
    });

    const markdown = renderMarkdown(children);

    const endTime = performance.now();
    const stats: ConversionStats = {
      startTime,
      endTime,
      duration: endTime - startTime,
      inputSize: data.length,
      outputSize: new TextEncoder().encode(markdown).byteLength,
    };

    const metadata: DocumentMetadata = {
      wordCount: ocrText.split(/\s+/).filter(Boolean).length,
      format: mimeType,
      customProperties: {
        imageId,
        width: dimensions?.width,
        height: dimensions?.height,
        ocrLanguage,
        ocrConfidence,
        ocrSuccess,
      },
    };

    return {
      markdown,
      metadata,
      assets: [],
      tables: [],
      images: [
        {
          id: imageId,
          data: new Uint8Array(data),
          mimeType,
          alt: "OCR source image",
          width: dimensions?.width,
          height: dimensions?.height,
        },
      ],
      headings: [],
      ast: documentNode,
      format: "markdown",
      converterId: this.id,
      stats,
    };
  }
}
