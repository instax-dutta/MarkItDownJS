import { AnyNode } from "@markitdownjs/shared";

export class JsonRenderer {
  render(node: AnyNode): string {
    return JSON.stringify(node, null, 2);
  }
}
