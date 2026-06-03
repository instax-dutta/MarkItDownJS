let domParserInstance: { new (): DOMParser; prototype: DOMParser } | undefined;

async function getDOMParser(): Promise<{ new (): DOMParser; prototype: DOMParser }> {
  if (domParserInstance) return domParserInstance;

  if (typeof globalThis.DOMParser !== "undefined") {
    domParserInstance = globalThis.DOMParser;
    return domParserInstance;
  }

  try {
    const mod = await import("linkedom");
    if (mod.DOMParser) {
      domParserInstance = mod.DOMParser as unknown as { new (): DOMParser; prototype: DOMParser };
      return domParserInstance;
    }
  } catch {
    // linkedom not available
  }

  throw new Error(
    "DOMParser is not available. Install 'linkedom' for Node.js support: npm install linkedom"
  );
}

export async function parseHTML(html: string): Promise<Document> {
  const DP = await getDOMParser();
  return new DP().parseFromString(html, "text/html");
}

export async function parseXML(xml: string): Promise<Document> {
  const DP = await getDOMParser();
  return new DP().parseFromString(xml, "application/xml");
}

export function serializeXML(doc: Document): string {
  if (typeof XMLSerializer !== "undefined") {
    return new XMLSerializer().serializeToString(doc);
  }
  return doc.documentElement?.outerHTML ?? "";
}
