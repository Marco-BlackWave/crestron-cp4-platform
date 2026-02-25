import type {
  Token, ProgramNode, IODeclNode, VarDeclNode, DefineConstantNode,
  EventHandlerNode, FunctionDeclNode, StructureDeclNode, StatementNode,
  ExpressionNode, IOType, EventType, ParseError,
} from "./types";
import { tokenize } from "./tokenizer";

export function parse(source: string): { ast: ProgramNode; errors: ParseError[] } {
  const rawTokens = tokenize(source);
  // Filter out comments and newlines for easier parsing
  const tokens = rawTokens.filter(t => t.type !== "comment" && t.type !== "newline");
  let pos = 0;
  const errors: ParseError[] = [];

  function cur(): Token { return tokens[pos] ?? { type: "eof", value: "", line: 0, col: 0 }; }
  function peek(offset = 0): Token { return tokens[pos + offset] ?? { type: "eof", value: "", line: 0, col: 0 }; }
  function at(type: string, value?: string): boolean {
    const t = cur();
    if (t.type !== type) return false;
    if (value !== undefined && t.value.toUpperCase() !== value.toUpperCase()) return false;
    return true;
  }
  function atValue(value: string): boolean { return cur().value.toUpperCase() === value.toUpperCase(); }
  function eat(type: string, value?: string): Token | null {
    if (at(type, value)) return tokens[pos++];
    return null;
  }
  function expect(type: string, value?: string): Token {
    const t = eat(type, value);
    if (!t) {
      const c = cur();
      const expected = value ? `${type} '${value}'` : type;
      addError(`Expected ${expected}, got '${c.value}'`, c.line, c.col);
      return c;
    }
    return t;
  }
  function addError(message: string, line: number, col?: number) {
    errors.push({ message, line, col });
  }
  function skipTo(...values: string[]) {
    const set = new Set(values);
    while (cur().type !== "eof" && !set.has(cur().value)) pos++;
  }

  // ── Top-level parsing ──

  const program: ProgramNode = {
    kind: "program",
    symbolName: "",
    directives: [],
    defines: [],
    ioDecls: [],
    varDecls: [],
    structures: [],
    eventHandlers: [],
    functions: [],
    mainFunction: null,
  };

  function parseProgram() {
    while (cur().type !== "eof") {
      try {
        if (at("directive")) {
          parseDirective();
        } else if (at("ioType")) {
          program.ioDecls.push(parseIODecl());
        } else if (at("varType")) {
          program.varDecls.push(parseVarDecl());
        } else if (at("keyword", "STRUCTURE")) {
          program.structures.push(parseStructureDecl());
        } else if (at("keyword", "PUSH") || at("keyword", "RELEASE") || at("keyword", "CHANGE")
          || at("keyword", "SOCKETCONNECT") || at("keyword", "SOCKETDISCONNECT") || at("keyword", "SOCKETRECEIVE")) {
          program.eventHandlers.push(parseEventHandler());
        } else if (at("keyword", "FUNCTION") || at("keyword", "INTEGER_FUNCTION") || at("keyword", "STRING_FUNCTION")) {
          const fn = parseFunctionDecl();
          if (fn.name.toUpperCase() === "MAIN") {
            program.mainFunction = fn;
          } else {
            program.functions.push(fn);
          }
        } else {
          // Skip unknown tokens at top level
          pos++;
        }
      } catch {
        // Error recovery: skip to next likely top-level token
        pos++;
      }
    }
  }

  function parseDirective() {
    const dir = tokens[pos++];
    const upper = dir.value.toUpperCase();
    if (upper === "#SYMBOL_NAME") {
      if (at("string")) {
        program.symbolName = tokens[pos++].value;
        program.directives.push({ name: "SYMBOL_NAME", value: program.symbolName, line: dir.line });
      }
    } else if (upper === "#DEFINE_CONSTANT") {
      const name = cur().type === "identifier" ? tokens[pos++].value : "";
      let value: string | number = "";
      if (at("number")) {
        value = parseNumericValue(tokens[pos++].value);
      } else if (at("string")) {
        value = tokens[pos++].value;
      } else if (at("identifier")) {
        value = tokens[pos++].value;
      }
      program.defines.push({ kind: "defineConstant", name, value, line: dir.line });
    } else {
      // Capture all other directives (#HINT, #CATEGORY, #DEFAULT_VOLATILE, etc.)
      const dirName = upper.replace(/^#/, "");
      let dirValue = "";
      if (at("string")) {
        dirValue = tokens[pos++].value;
      } else if (at("number")) {
        dirValue = tokens[pos++].value;
      } else if (at("identifier")) {
        dirValue = tokens[pos++].value;
      }
      program.directives.push({ name: dirName, value: dirValue, line: dir.line });
    }
    eat("punctuation", ";");
  }

  function parseIODecl(): IODeclNode {
    const typeTok = tokens[pos++];
    const ioType = typeTok.value.toUpperCase() as IOType;
    const names: string[] = [];
    let arraySize: number | undefined;

    while (cur().type !== "eof") {
      if (at("identifier")) {
        names.push(tokens[pos++].value);
      }
      // Check for array notation [N]
      if (eat("punctuation", "[")) {
        if (at("number")) arraySize = parseNumericValue(tokens[pos++].value);
        expect("punctuation", "]");
      }
      if (!eat("punctuation", ",")) break;
    }
    eat("punctuation", ";");
    return { kind: "ioDecl", ioType, names, arraySize, line: typeTok.line };
  }

  function parseVarDecl(): VarDeclNode {
    const typeTok = tokens[pos++];
    const varType = typeTok.value.toUpperCase();
    const names: { name: string; arraySize?: number; initSize?: number }[] = [];

    while (cur().type !== "eof") {
      if (at("identifier")) {
        const name = tokens[pos++].value;
        let arraySize: number | undefined;
        let initSize: number | undefined;
        if (eat("punctuation", "[")) {
          if (at("number")) arraySize = parseNumericValue(tokens[pos++].value);
          expect("punctuation", "]");
        }
        if (eat("punctuation", "[")) {
          if (at("number")) initSize = parseNumericValue(tokens[pos++].value);
          expect("punctuation", "]");
        }
        names.push({ name, arraySize, initSize });
      } else {
        break;
      }
      if (!eat("punctuation", ",")) break;
    }
    eat("punctuation", ";");
    return { kind: "varDecl", varType, names, line: typeTok.line };
  }

  function parseStructureDecl(): StructureDeclNode {
    const t = tokens[pos++]; // STRUCTURE
    const name = at("identifier") ? tokens[pos++].value : "unknown";
    expect("punctuation", "{");
    const fields: { name: string; type: string; arraySize?: number }[] = [];
    while (!at("punctuation", "}") && cur().type !== "eof") {
      if (at("varType")) {
        const fieldType = tokens[pos++].value.toUpperCase();
        while (at("identifier")) {
          const fieldName = tokens[pos++].value;
          let arraySize: number | undefined;
          if (eat("punctuation", "[")) {
            if (at("number")) arraySize = parseNumericValue(tokens[pos++].value);
            expect("punctuation", "]");
          }
          fields.push({ name: fieldName, type: fieldType, arraySize });
          if (!eat("punctuation", ",")) break;
        }
        eat("punctuation", ";");
      } else {
        pos++;
      }
    }
    expect("punctuation", "}");
    eat("punctuation", ";");
    return { kind: "structureDecl", name, fields, line: t.line };
  }

  function parseEventHandler(): EventHandlerNode {
    const evtTok = tokens[pos++];
    const eventType = evtTok.value.toUpperCase() as EventType;
    const signalName = at("identifier") ? tokens[pos++].value : "";
    expect("punctuation", "{");
    const body = parseBlock();
    expect("punctuation", "}");
    return { kind: "eventHandler", eventType, signalName, body, line: evtTok.line };
  }

  function parseFunctionDecl(): FunctionDeclNode {
    const fnTok = tokens[pos++];
    let returnType: "void" | "integer" | "string" = "void";
    if (fnTok.value.toUpperCase() === "INTEGER_FUNCTION") returnType = "integer";
    else if (fnTok.value.toUpperCase() === "STRING_FUNCTION") returnType = "string";

    const name = at("identifier") ? tokens[pos++].value : "unknown";
    const params: { name: string; type: string }[] = [];

    if (eat("punctuation", "(")) {
      while (!at("punctuation", ")") && cur().type !== "eof") {
        let pType = "INTEGER";
        if (at("varType")) pType = tokens[pos++].value.toUpperCase();
        if (at("identifier")) {
          params.push({ name: tokens[pos++].value, type: pType });
        }
        if (!eat("punctuation", ",")) break;
      }
      expect("punctuation", ")");
    }

    expect("punctuation", "{");
    const localVars: VarDeclNode[] = [];
    // Parse local variable declarations at function start
    while (at("varType")) {
      localVars.push(parseVarDecl());
    }
    const body = parseBlock();
    expect("punctuation", "}");

    return { kind: "functionDecl", name, returnType, params, localVars, body, line: fnTok.line };
  }

  // ── Statement parsing ──

  function parseBlock(): StatementNode[] {
    const stmts: StatementNode[] = [];
    while (!at("punctuation", "}") && cur().type !== "eof") {
      try {
        const stmt = parseStatement();
        if (stmt) stmts.push(stmt);
      } catch {
        skipTo(";", "}");
        eat("punctuation", ";");
      }
    }
    return stmts;
  }

  function parseStatement(): StatementNode | null {
    if (at("keyword", "IF")) return parseIf();
    if (at("keyword", "FOR")) return parseFor();
    if (at("keyword", "WHILE")) return parseWhile();
    if (at("keyword", "DO")) return parseDoUntil();
    if (at("keyword", "SWITCH") || at("keyword", "CSWITCH")) return parseSwitch();
    if (at("keyword", "WAIT")) return parseWait();
    if (at("keyword", "CANCELWAIT") || at("keyword", "CANCELALLWAIT") || at("keyword", "RETIMEWAIT")) {
      return parseAssignmentOrCall();
    }
    if (at("keyword", "RETURN")) return parseReturn();
    if (at("keyword", "BREAK")) { const t = tokens[pos++]; eat("punctuation", ";"); return { kind: "break", line: t.line }; }
    if (at("keyword", "TERMINATEEVENT")) { const t = tokens[pos++]; eat("punctuation", ";"); return { kind: "call", name: "TERMINATEEVENT", args: [], line: t.line }; }
    if (at("keyword", "CREATETHREAD") || at("keyword", "CRITICALSECTION_BEGIN") || at("keyword", "CRITICALSECTION_END")) {
      return parseAssignmentOrCall();
    }

    // Assignment or function call
    if (at("identifier") || at("builtin")) {
      return parseAssignmentOrCall();
    }

    // Skip unrecognized
    pos++;
    return null;
  }

  function parseIf(): StatementNode {
    const t = tokens[pos++]; // IF
    eat("punctuation", "(");
    const condition = parseExpression();
    eat("punctuation", ")");

    let thenBody: StatementNode[];
    if (eat("punctuation", "{")) {
      thenBody = parseBlock();
      expect("punctuation", "}");
    } else {
      const s = parseStatement();
      thenBody = s ? [s] : [];
      eat("punctuation", ";");
    }

    let elseBody: StatementNode[] = [];
    if (eat("keyword", "ELSE")) {
      if (eat("punctuation", "{")) {
        elseBody = parseBlock();
        expect("punctuation", "}");
      } else {
        const s = parseStatement();
        elseBody = s ? [s] : [];
      }
    }
    return { kind: "if", condition, thenBody, elseBody, line: t.line };
  }

  function parseFor(): StatementNode {
    const t = tokens[pos++]; // FOR
    eat("punctuation", "(");
    const variable = at("identifier") ? tokens[pos++].value : "";
    expect("operator", "=");
    const from = parseExpression();
    expect("keyword", "TO");
    const to = parseExpression();
    let step: ExpressionNode | null = null;
    if (eat("keyword", "STEP")) step = parseExpression();
    eat("punctuation", ")");

    expect("punctuation", "{");
    const body = parseBlock();
    expect("punctuation", "}");
    return { kind: "for", variable, from, to, step, body, line: t.line };
  }

  function parseWhile(): StatementNode {
    const t = tokens[pos++]; // WHILE
    eat("punctuation", "(");
    const condition = parseExpression();
    eat("punctuation", ")");
    expect("punctuation", "{");
    const body = parseBlock();
    expect("punctuation", "}");
    return { kind: "while", condition, body, line: t.line };
  }

  function parseDoUntil(): StatementNode {
    const t = tokens[pos++]; // DO
    expect("punctuation", "{");
    const body = parseBlock();
    expect("punctuation", "}");
    expect("keyword", "UNTIL");
    eat("punctuation", "(");
    const condition = parseExpression();
    eat("punctuation", ")");
    eat("punctuation", ";");
    return { kind: "doUntil", condition, body, line: t.line };
  }

  function parseSwitch(): StatementNode {
    const t = tokens[pos++];
    const usesCswitch = t.value.toUpperCase() === "CSWITCH";
    eat("punctuation", "(");
    const expr = parseExpression();
    eat("punctuation", ")");
    expect("punctuation", "{");
    const cases: { value: ExpressionNode | null; body: StatementNode[] }[] = [];

    while (!at("punctuation", "}") && cur().type !== "eof") {
      if (eat("keyword", "CASE")) {
        eat("punctuation", "(");
        const value = parseExpression();
        eat("punctuation", ")");
        eat("punctuation", ":");
        const body: StatementNode[] = [];
        while (!at("keyword", "CASE") && !at("keyword", "DEFAULT") && !at("punctuation", "}") && cur().type !== "eof") {
          const s = parseStatement();
          if (s) body.push(s);
        }
        cases.push({ value, body });
      } else if (eat("keyword", "DEFAULT")) {
        eat("punctuation", ":");
        const body: StatementNode[] = [];
        while (!at("keyword", "CASE") && !at("punctuation", "}") && cur().type !== "eof") {
          const s = parseStatement();
          if (s) body.push(s);
        }
        cases.push({ value: null, body });
      } else {
        pos++;
      }
    }
    expect("punctuation", "}");
    return { kind: "switch", usesCswitch, expr, cases, line: t.line };
  }

  function parseWait(): StatementNode {
    const t = tokens[pos++]; // WAIT
    eat("punctuation", "(");
    const duration = parseExpression();
    let label = "";
    if (eat("punctuation", ",")) {
      if (at("identifier")) label = tokens[pos++].value;
    }
    eat("punctuation", ")");
    // WAIT can have a body block or be a single-statement
    if (eat("punctuation", "{")) {
      const body = parseBlock();
      expect("punctuation", "}");
      return { kind: "wait", duration, label, body, line: t.line };
    }
    // No body — treat as delay-style
    eat("punctuation", ";");
    return { kind: "wait", duration, label, body: [], line: t.line };
  }

  function parseReturn(): StatementNode {
    const t = tokens[pos++]; // RETURN
    let value: ExpressionNode | null = null;
    if (!at("punctuation", ";") && !at("punctuation", "}")) {
      eat("punctuation", "(");
      value = parseExpression();
      eat("punctuation", ")");
    }
    eat("punctuation", ";");
    return { kind: "return", value, line: t.line };
  }

  function parseAssignmentOrCall(): StatementNode {
    const nameTok = tokens[pos++];
    const name = nameTok.value;

    // Function call: name(args)
    if (eat("punctuation", "(")) {
      const args = parseArgList();
      expect("punctuation", ")");
      eat("punctuation", ";");
      return { kind: "call", name, args, line: nameTok.line };
    }

    // Dot access assignment: name.field = expr or name.field[idx] = expr
    if (eat("punctuation", ".")) {
      const field = at("identifier") ? tokens[pos++].value : "unknown";
      let dotIndex: ExpressionNode | null = null;
      if (eat("punctuation", "[")) {
        dotIndex = parseExpression();
        expect("punctuation", "]");
      }
      if (eat("operator", "=")) {
        const value = parseExpression();
        eat("punctuation", ";");
        const target = dotIndex ? `${name}.${field}[__idx__]` : `${name}.${field}`;
        return { kind: "assignment", target, index: dotIndex, value, line: nameTok.line };
      }
      eat("punctuation", ";");
      return { kind: "call", name: `${name}.${field}`, args: [], line: nameTok.line };
    }

    // Array index assignment: name[idx] = expr (possibly multi-dim name[i][j] = expr)
    if (eat("punctuation", "[")) {
      const firstIndex = parseExpression();
      expect("punctuation", "]");
      // Check for second dimension
      if (eat("punctuation", "[")) {
        const secondIndex = parseExpression();
        expect("punctuation", "]");
        expect("operator", "=");
        const value = parseExpression();
        eat("punctuation", ";");
        // Use a BinaryExpr node to pack both indices — runtime will detect name containing "[][]"
        const packedIndex: ExpressionNode = {
          kind: "binaryExpr", op: "MULTIDIM", left: firstIndex, right: secondIndex,
        };
        return { kind: "assignment", target: name, index: packedIndex, value, line: nameTok.line };
      }
      expect("operator", "=");
      const value = parseExpression();
      eat("punctuation", ";");
      return { kind: "assignment", target: name, index: firstIndex, value, line: nameTok.line };
    }

    // Simple assignment: name = expr
    if (eat("operator", "=")) {
      const value = parseExpression();
      eat("punctuation", ";");
      return { kind: "assignment", target: name, index: null, value, line: nameTok.line };
    }

    // Bare identifier (could be a statement expression)
    eat("punctuation", ";");
    return { kind: "call", name, args: [], line: nameTok.line };
  }

  function parseArgList(): ExpressionNode[] {
    const args: ExpressionNode[] = [];
    if (at("punctuation", ")")) return args;
    args.push(parseExpression());
    while (eat("punctuation", ",")) {
      args.push(parseExpression());
    }
    return args;
  }

  // ── Expression parsing (precedence climbing) ──

  function parseExpression(): ExpressionNode {
    return parseOr();
  }

  // Precedence (low→high):
  // OR > AND > BOR > BXOR > BAND > Comparison > Shift > AddSub > MulDiv > Unary(NOT/BNOT/-)

  function parseOr(): ExpressionNode {
    let left = parseAnd();
    while (atValue("OR") || at("operator", "||")) {
      pos++;
      left = { kind: "binaryExpr", op: "||", left, right: parseAnd() };
    }
    return left;
  }

  function parseAnd(): ExpressionNode {
    let left = parseBitwiseOr();
    while (atValue("AND") || at("operator", "&&")) {
      pos++;
      left = { kind: "binaryExpr", op: "&&", left, right: parseBitwiseOr() };
    }
    return left;
  }

  function parseBitwiseOr(): ExpressionNode {
    let left = parseBitwiseXor();
    while (atValue("BOR") || at("operator", "|")) {
      pos++;
      left = { kind: "binaryExpr", op: "BOR", left, right: parseBitwiseXor() };
    }
    return left;
  }

  function parseBitwiseXor(): ExpressionNode {
    let left = parseBitwiseAnd();
    while (atValue("BXOR") || at("operator", "^")) {
      pos++;
      left = { kind: "binaryExpr", op: "BXOR", left, right: parseBitwiseAnd() };
    }
    return left;
  }

  function parseBitwiseAnd(): ExpressionNode {
    let left = parseComparison();
    while (atValue("BAND") || at("operator", "&")) {
      pos++;
      left = { kind: "binaryExpr", op: "BAND", left, right: parseComparison() };
    }
    return left;
  }

  function parseComparison(): ExpressionNode {
    let left = parseShift();
    while (at("operator", "=") || at("operator", "<>") || at("operator", "<") ||
           at("operator", ">") || at("operator", "<=") || at("operator", ">=")) {
      const op = tokens[pos++].value === "=" ? "==" : tokens[pos - 1].value === "<>" ? "!=" : tokens[pos - 1].value;
      left = { kind: "binaryExpr", op, left, right: parseShift() };
    }
    return left;
  }

  function parseShift(): ExpressionNode {
    let left = parseAddSub();
    while (at("operator", "<<") || at("operator", ">>")) {
      const op = tokens[pos++].value;
      left = { kind: "binaryExpr", op, left, right: parseAddSub() };
    }
    return left;
  }

  function parseAddSub(): ExpressionNode {
    let left = parseMulDiv();
    while (at("operator", "+") || at("operator", "-")) {
      const op = tokens[pos++].value;
      left = { kind: "binaryExpr", op, left, right: parseMulDiv() };
    }
    return left;
  }

  function parseMulDiv(): ExpressionNode {
    let left = parseUnary();
    while (at("operator", "*") || at("operator", "/") || atValue("MOD") || at("operator", "%")) {
      const op = tokens[pos++].value.toUpperCase() === "MOD" ? "%" : tokens[pos - 1].value;
      left = { kind: "binaryExpr", op, left, right: parseUnary() };
    }
    return left;
  }

  function parseUnary(): ExpressionNode {
    if (at("operator", "-")) {
      pos++;
      return { kind: "unaryExpr", op: "-", operand: parseUnary() };
    }
    if (at("operator", "!") || atValue("NOT")) {
      pos++;
      return { kind: "unaryExpr", op: "!", operand: parseUnary() };
    }
    if (atValue("BNOT") || at("operator", "~")) {
      pos++;
      return { kind: "unaryExpr", op: "BNOT", operand: parseUnary() };
    }
    return parseAtom();
  }

  function parseAtom(): ExpressionNode {
    // Parenthesized expression
    if (eat("punctuation", "(")) {
      const expr = parseExpression();
      expect("punctuation", ")");
      return expr;
    }

    // Number literal
    if (at("number")) {
      const t = tokens[pos++];
      return { kind: "numberLiteral", value: parseNumericValue(t.value) };
    }

    // String literal
    if (at("string")) {
      const t = tokens[pos++];
      return { kind: "stringLiteral", value: t.value };
    }

    // Function call, identifier, dot access, or array index
    if (at("identifier") || at("builtin") || at("keyword", "CANCELWAIT") || at("keyword", "RETIMEWAIT") || at("keyword", "CREATETHREAD") || at("keyword", "CRITICALSECTION_BEGIN") || at("keyword", "CRITICALSECTION_END")) {
      const t = tokens[pos++];
      // Function call
      if (eat("punctuation", "(")) {
        const args = parseArgList();
        expect("punctuation", ")");
        return { kind: "callExpr", name: t.value, args };
      }
      // Dot access: name.field or name.field[idx]
      if (eat("punctuation", ".")) {
        const field = at("identifier") ? tokens[pos++].value : "unknown";
        let index: ExpressionNode | undefined;
        if (eat("punctuation", "[")) {
          index = parseExpression();
          expect("punctuation", "]");
        }
        return { kind: "dotAccess", object: t.value, field, index };
      }
      // Array index (possibly multi-dim)
      if (eat("punctuation", "[")) {
        const firstIndex = parseExpression();
        expect("punctuation", "]");
        const indices: ExpressionNode[] = [firstIndex];
        // Check for additional dimensions: name[i][j]
        while (eat("punctuation", "[")) {
          indices.push(parseExpression());
          expect("punctuation", "]");
        }
        return { kind: "indexExpr", name: t.value, index: firstIndex, indices };
      }
      return { kind: "identifier", name: t.value };
    }

    // Fallback
    const t = cur();
    addError(`Unexpected token '${t.value}'`, t.line, t.col);
    pos++;
    return { kind: "numberLiteral", value: 0 };
  }

  function parseNumericValue(s: string): number {
    if (s.startsWith("0x") || s.startsWith("0X")) return parseInt(s, 16) || 0;
    return parseInt(s, 10) || 0;
  }

  // Run
  parseProgram();
  return { ast: program, errors };
}
