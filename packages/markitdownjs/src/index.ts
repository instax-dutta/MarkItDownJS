/**
 * markitdownjs — the simplest way to install MarkItDownJS.
 *
 * Just `npm install markitdownjs` and you get all converters, renderers,
 * chunkers, and utilities in one package.
 *
 * @example
 * ```typescript
 * import { MarkItDown, createMarkItDown } from "markitdownjs";
 *
 * const md = createMarkItDown();
 * const result = await md.convert("report.docx");
 * console.log(result.markdown);
 * ```
 */
export * from "@markitdownjs/all";
