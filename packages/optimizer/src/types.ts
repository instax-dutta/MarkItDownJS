import type { AnyNode, DocumentNode } from "@markitdownjs/shared";

/** An optimizer rule that transforms an AST to reduce noise */
export interface OptimizerRule {
  /** Human-readable rule name */
  name: string;
  /** Returns true if this rule should be applied to the given AST */
  applies: (node: DocumentNode) => boolean;
  /** Transform the AST node. Return null to remove the node, or the transformed node. */
  transform: (node: AnyNode) => AnyNode | null;
}

/** Configuration for the Optimizer */
export interface OptimizerConfig {
  /** Rules to apply (built-in rule names or custom OptimizerRule instances) */
  rules: (string | OptimizerRule)[];
  /** Custom rules (appended after built-in rules) */
  custom?: OptimizerRule[];
}
