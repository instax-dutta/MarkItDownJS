import type { AnyNode, DocumentNode } from "@markitdownjs/shared";
import type { OptimizerConfig, OptimizerRule } from "./types.js";
import { BUILTIN_RULES } from "./rules.js";

/**
 * Semantic noise collapsing pipeline.
 * Runs rules on the AST before rendering to reduce token count.
 * Target: 15-30% reduction on typical enterprise documents.
 */
export class Optimizer {
  private rules: OptimizerRule[];

  constructor(config: OptimizerConfig) {
    this.rules = [];

    // Resolve built-in rules by name.
    for (const rule of config.rules) {
      if (typeof rule === "string") {
        const builtin = BUILTIN_RULES[rule];
        if (builtin) {
          this.rules.push(builtin);
        }
      } else {
        this.rules.push(rule);
      }
    }

    // Append custom rules.
    if (config.custom) {
      this.rules.push(...config.custom);
    }
  }

  /**
   * Run all rules on an AST and return the optimized AST.
   * Rules are applied in order. A rule returning null removes the node.
   */
  optimize(ast: DocumentNode): DocumentNode {
    const optimized: DocumentNode = { ...ast, children: [...(ast.children ?? [])] };

    for (const rule of this.rules) {
      const result = this.applyRule(optimized, rule);
      if (result && result.type === "document") {
        Object.assign(optimized, result);
      }
    }

    return optimized;
  }

  /**
   * Apply a single rule to the entire AST tree.
   */
  private applyRule(node: AnyNode, rule: OptimizerRule): AnyNode {
    if ("children" in node && Array.isArray(node.children)) {
      const children: AnyNode[] = [];
      for (const child of node.children) {
        const result = this.applyRule(child, rule);
        if (result !== null) {
          children.push(result);
        }
      }
      node = { ...node, children };
    }

    // Apply rule to the current node.
    if (rule.applies(node as DocumentNode)) {
      const result = rule.transform(node);
      return result ?? node;
    }

    return node;
  }

  /**
   * Get the list of active rule names.
   */
  getRuleNames(): string[] {
    return this.rules.map((r) => r.name);
  }
}
