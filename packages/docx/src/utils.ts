/**
 * Namespace-agnostic tag-name matching for OOXML.
 *
 * Different DOM polyfills handle XML namespace prefixes inconsistently:
 *   - True XML parsers strip the prefix → `localName === "p"` for `<w:p>`.
 *   - HTML-oriented parsers like linkedom keep it → `localName === "w:p"`.
 *
 * This helper matches both shapes so the converter works under any polyfill.
 */
export function isTag(node: Element | null | undefined, target: string): boolean {
  if (!node) return false;
  const name = node.localName || node.nodeName || "";
  return name === target || name.endsWith(":" + target);
}
