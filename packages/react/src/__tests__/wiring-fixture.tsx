// Compile-time wiring fixture. This file is typechecked (not executed) to
// verify the React integration accepts an injected MarkItDown parser and
// converters. There is no React renderer installed in this repository, so a
// runtime test is not possible here.
import type { MarkItDownProviderProps, MarkItDownParser } from "../provider.js";
import type { MarkItDown } from "@markitdownjs/core";

type Assert<T extends true> = T;

// Each element fails to compile if the public API regresses:
//   - a real MarkItDown instance must satisfy the structural parser type,
//   - the provider must expose `parser` and `converters` props.
export type _WiringAssertions = [
  Assert<MarkItDown extends MarkItDownParser ? true : false>,
  Assert<"parser" extends keyof MarkItDownProviderProps ? true : false>,
  Assert<"converters" extends keyof MarkItDownProviderProps ? true : false>,
];
