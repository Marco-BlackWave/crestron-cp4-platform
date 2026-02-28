import type { Token, TokenType } from "./types";

const KEYWORDS = new Set([
  "IF", "ELSE", "FOR", "TO", "STEP", "WHILE", "DO", "UNTIL",
  "SWITCH", "CASE", "DEFAULT", "BREAK", "CSWITCH", "RETURN",
  "PUSH", "RELEASE", "CHANGE", "FUNCTION", "INTEGER_FUNCTION",
  "STRING_FUNCTION", "AND", "OR", "NOT", "MOD",
  "BAND", "BOR", "BNOT", "BXOR", "STRUCTURE",
  "WAIT", "CANCELWAIT", "CANCELALLWAIT", "RETIMEWAIT",
  "TERMINATEEVENT", "SOCKETCONNECT", "SOCKETDISCONNECT", "SOCKETRECEIVE",
  "CREATETHREAD", "CRITICALSECTION_BEGIN", "CRITICALSECTION_END",
]);

const IO_TYPES = new Set([
  "DIGITAL_INPUT", "DIGITAL_OUTPUT",
  "ANALOG_INPUT", "ANALOG_OUTPUT",
  "STRING_INPUT", "STRING_OUTPUT",
  "BUFFER_INPUT",
]);

const VAR_TYPES = new Set([
  "INTEGER", "LONG_INTEGER", "SIGNED_INTEGER", "SIGNED_LONG_INTEGER",
  "STRING", "INTEGER_PARAMETER", "STRING_PARAMETER",
]);

const BUILTINS = new Set([
  // Output
  "PRINT", "TRACE", "MAKESTRING",
  // Conversion
  "ATOI", "ITOA", "ATOL", "LTOA", "CHR", "BYTE",
  // String
  "LEN", "LEFT", "RIGHT", "MID", "FIND", "UPPER", "LOWER", "REMOVE",
  "SETSTRING", "CLEARBUFFER", "GETC", "RESIZESTRING",
  "GATHERASYNC", "GATHERBYLENGTH",
  // Math
  "MIN", "MAX", "ABS", "MULDIV",
  // Array
  "SETARRAY", "GETLASTMODIFIEDARRAYINDEX",
  // Timing
  "DELAY", "PULSE", "PROCESSLOGIC",
  // System
  "ISSIGNALDEFINED", "WAITFORINITIALIZATIONCOMPLETE",
  // Date/Time
  "GETDATENUM", "GETDAYOFWEEKNUM", "GETHOURNUM", "GETMINUTESNUM",
  "GETMONTHNUM", "GETSECONDSNUM", "GETYEARNUM", "TIME", "DATE", "DAY",
  // File I/O
  "FILEOPEN", "FILECLOSE", "FILEREAD", "FILEWRITE", "FILESEEK", "FILEDELETE",
  "FINDFIRST", "FINDNEXT", "FINDCLOSE", "MAKEDIRECTORY", "STARTFILETRANSFER",
  "ISFILE", "ISDIRECTORY", "FILELEN",
  // Sockets
  "SOCKETCONNECTTCP", "SOCKETSEND", "SOCKETGETADDRESS",
  "SOCKETGETSTATUS", "SOCKETGETREMOTEIPADDRESS", "SOCKETSERVERSTARTLISTEN",
]);

export { KEYWORDS, IO_TYPES, VAR_TYPES, BUILTINS };

const TWO_CHAR_OPS = new Set(["<>", "<=", ">=", "&&", "||", "<<"  , ">>"]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function peek(): string { return pos < source.length ? source[pos] : ""; }
  function advance(): string {
    const ch = source[pos++];
    if (ch === "\n") { line++; col = 1; } else { col++; }
    return ch;
  }
  function push(type: TokenType, value: string, startLine: number, startCol: number) {
    tokens.push({ type, value, line: startLine, col: startCol });
  }

  while (pos < source.length) {
    const startLine = line;
    const startCol = col;
    const ch = peek();

    // Whitespace (skip, but track newlines)
    if (ch === " " || ch === "\t" || ch === "\r") {
      advance();
      continue;
    }

    if (ch === "\n") {
      advance();
      push("newline", "\n", startLine, startCol);
      continue;
    }

    // Line comment
    if (ch === "/" && pos + 1 < source.length && source[pos + 1] === "/") {
      let comment = "";
      while (pos < source.length && peek() !== "\n") comment += advance();
      push("comment", comment, startLine, startCol);
      continue;
    }

    // Block comment
    if (ch === "/" && pos + 1 < source.length && source[pos + 1] === "*") {
      let comment = advance() + advance(); // /*
      while (pos < source.length) {
        if (peek() === "*" && pos + 1 < source.length && source[pos + 1] === "/") {
          comment += advance() + advance();
          break;
        }
        comment += advance();
      }
      push("comment", comment, startLine, startCol);
      continue;
    }

    // Directives: #SYMBOL_NAME, #DEFINE_CONSTANT, etc.
    if (ch === "#") {
      let directive = advance();
      while (pos < source.length && /[A-Za-z0-9_]/.test(peek())) directive += advance();
      push("directive", directive, startLine, startCol);
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = advance();
      let str = "";
      while (pos < source.length && peek() !== quote) {
        if (peek() === "\\") {
          advance(); // backslash
          const esc = peek();
          if (esc === "n") { advance(); str += "\n"; }
          else if (esc === "t") { advance(); str += "\t"; }
          else if (esc === "\\") { advance(); str += "\\"; }
          else if (esc === quote) { advance(); str += quote; }
          else if (esc === "x" || esc === "X") {
            advance();
            let hex = "";
            for (let i = 0; i < 2 && pos < source.length && /[0-9A-Fa-f]/.test(peek()); i++) hex += advance();
            str += String.fromCharCode(parseInt(hex, 16) || 0);
          } else {
            str += advance();
          }
        } else {
          str += advance();
        }
      }
      if (pos < source.length) advance(); // closing quote
      push("string", str, startLine, startCol);
      continue;
    }

    // Numbers (decimal and 0x hex)
    if (/[0-9]/.test(ch)) {
      let num = advance();
      if (num === "0" && (peek() === "x" || peek() === "X")) {
        num += advance();
        while (pos < source.length && /[0-9A-Fa-f]/.test(peek())) num += advance();
      } else {
        while (pos < source.length && /[0-9]/.test(peek())) num += advance();
      }
      push("number", num, startLine, startCol);
      continue;
    }

    // Identifiers and keywords
    if (/[A-Za-z_]/.test(ch)) {
      let word = advance();
      while (pos < source.length && /[A-Za-z0-9_]/.test(peek())) word += advance();
      const upper = word.toUpperCase();
      if (KEYWORDS.has(upper)) push("keyword", upper, startLine, startCol);
      else if (IO_TYPES.has(upper)) push("ioType", upper, startLine, startCol);
      else if (VAR_TYPES.has(upper)) push("varType", upper, startLine, startCol);
      else if (BUILTINS.has(upper)) push("builtin", upper, startLine, startCol);
      else push("identifier", word, startLine, startCol);
      continue;
    }

    // Two-char operators
    if (pos + 1 < source.length) {
      const two = ch + source[pos + 1];
      if (TWO_CHAR_OPS.has(two)) {
        advance(); advance();
        push("operator", two, startLine, startCol);
        continue;
      }
    }

    // Single-char operators and punctuation
    if ("=<>+-*/%!&|^~".includes(ch)) {
      push("operator", advance(), startLine, startCol);
      continue;
    }

    if ("(){}[];,.".includes(ch)) {
      push("punctuation", advance(), startLine, startCol);
      continue;
    }

    // Unknown character — skip
    advance();
  }

  push("eof", "", line, col);
  return tokens;
}
