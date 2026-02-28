import { StreamLanguage } from "@codemirror/language";
import { KEYWORDS, IO_TYPES, VAR_TYPES, BUILTINS } from "./tokenizer";

const simplPlusDef = StreamLanguage.define({
  token(stream) {
    // Whitespace
    if (stream.eatSpace()) return null;

    // Line comment
    if (stream.match("//")) {
      stream.skipToEnd();
      return "lineComment";
    }

    // Block comment
    if (stream.match("/*")) {
      while (!stream.eol()) {
        if (stream.match("*/")) return "blockComment";
        stream.next();
      }
      return "blockComment";
    }

    // Directive
    if (stream.match(/^#[A-Za-z_][A-Za-z0-9_]*/)) {
      return "meta";
    }

    // String
    if (stream.match('"')) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "\\") stream.next();
        else if (ch === '"') break;
      }
      return "string";
    }

    // Hex number
    if (stream.match(/^0[xX][0-9A-Fa-f]+/)) return "number";

    // Decimal number
    if (stream.match(/^[0-9]+/)) return "number";

    // Identifiers and keywords
    if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*/)) {
      const word = stream.current().toUpperCase();
      if (KEYWORDS.has(word)) return "keyword";
      if (IO_TYPES.has(word)) return "typeName";
      if (VAR_TYPES.has(word)) return "typeName";
      if (BUILTINS.has(word)) return "keyword";
      return "variableName";
    }

    // Two-char operators
    if (stream.match("<>") || stream.match("<=") || stream.match(">=") ||
        stream.match("&&") || stream.match("||") || stream.match("<<") ||
        stream.match(">>")) {
      return "operator";
    }

    // Single-char operators
    if (stream.match(/^[=<>+\-*/%!&|^~]/)) return "operator";

    // Punctuation
    if (stream.match(/^[(){}[\];,.]/)) return "punctuation";

    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
  },
});

export { simplPlusDef };
