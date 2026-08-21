"use server";

import type { ConversionResult } from "@markitdownjs/shared";
import type { MarkItDownParser } from "./types.js";

export async function convertDocumentAction(
  formData: FormData,
  parser?: MarkItDownParser
): Promise<ConversionResult> {
  if (!parser) {
    throw new Error("No parser configured. Pass a MarkItDown instance to convertDocumentAction.");
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    throw new Error("No file provided");
  }

  return parser.convert(file);
}
