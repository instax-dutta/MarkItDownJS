/**
 * markitdownjs — the simplest way to install MarkItDownJS.
 *
 * Just `npm install markitdownjs` and you get all converters, renderers,
 * chunkers, and utilities in one package.
 *
 * @example
 * ```typescript
 * import { MarkItDown, createMarkItDown } from "@markitdownjs/markitdownjs";
 *
 * const md = createMarkItDown();
 * // Pass file bytes with a filename (or a File/Blob), not a path string.
 * const result = await md.convert({ data: fileBytes, fileName: "report.docx" });
 * console.log(result.markdown);
 * ```
 */
export * from "@markitdownjs/all";
