import { MarkItDown } from "markitdownjs";
import { CustomFormatConverter } from "./custom-converter.js";

async function main() {
  const md = new MarkItDown();
  md.registerConverter(new CustomFormatConverter());

  const result = await md.convert({
    data: "Hello from the custom format!",
    mimeType: "application/x-custom",
  });

  console.log("=== Custom Converter Result ===");
  console.log(result.markdown);
}

main().catch(console.error);
