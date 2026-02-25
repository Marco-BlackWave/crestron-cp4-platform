import type {
  ProgramNode, StatementNode, ExpressionNode, EventHandlerNode,
  FunctionDeclNode, IOType, IOState, ParseError, StructureDeclNode,
} from "./types";
import { parse } from "./parser";
import { callBuiltin } from "./builtins";
import { preprocess } from "./preprocessor";
import type { PreprocessResult } from "./preprocessor";
import { VirtualFileSystem } from "./virtualFs";
import { VirtualNetwork } from "./virtualNet";

const MAX_STEPS = 200_000;

// ── Type wrapping helpers (SIMPL+ integer semantics) ──
function wrapInteger(n: number): number { return ((n % 65536) + 65536) % 65536; }
function wrapLongInteger(n: number): number { return n >>> 0; }
function wrapSignedInteger(n: number): number { return ((n + 32768) % 65536 + 65536) % 65536 - 32768; }
function wrapSignedLongInteger(n: number): number { return n | 0; }

export interface RuntimeCallbacks {
  onConsoleOutput: (msg: string) => void;
  onOutputChange: (type: "digital" | "analog" | "string", name: string, value: number | string) => void;
  onError: (error: ParseError) => void;
}

export class SimplPlusRuntime {
  private ast: ProgramNode | null = null;
  private io: IOState = {
    digitalInputs: new Map(),
    digitalOutputs: new Map(),
    analogInputs: new Map(),
    analogOutputs: new Map(),
    stringInputs: new Map(),
    stringOutputs: new Map(),
  };
  private variables: Map<string, number | string> = new Map();
  private constants: Map<string, number | string> = new Map();
  private scopeStack: Map<string, number | string>[] = [];
  private eventHandlers: EventHandlerNode[] = [];
  private functions: Map<string, FunctionDeclNode> = new Map();
  private typeInfo: Map<string, string> = new Map();
  private structureDefs: Map<string, StructureDeclNode> = new Map();
  private lastModifiedIndex: Map<string, number> = new Map();
  private waitTimers: Map<string, { id: ReturnType<typeof setTimeout>; resolve: () => void }> = new Map();
  private steps = 0;
  private callbacks: RuntimeCallbacks;
  private breakFlag = false;
  private returnFlag = false;
  private returnValue: number | string = 0;
  private abortController: AbortController | null = null;
  private _isExecuting = false;
  private preprocessResult: PreprocessResult | null = null;
  private vfs: VirtualFileSystem = new VirtualFileSystem();
  private vnet: VirtualNetwork = new VirtualNetwork();
  private criticalSections: Map<string, boolean> = new Map();
  errors: ParseError[] = [];

  constructor(callbacks: RuntimeCallbacks) {
    this.callbacks = callbacks;
  }

  get isExecuting(): boolean { return this._isExecuting; }
  getIO(): IOState { return this.io; }
  getAST(): ProgramNode | null { return this.ast; }
  getPreprocessResult(): PreprocessResult | null { return this.preprocessResult; }
  getVFS(): VirtualFileSystem { return this.vfs; }
  getVNet(): VirtualNetwork { return this.vnet; }

  load(source: string) {
    this.reset();
    // Run preprocessor first
    this.preprocessResult = preprocess(source);
    const { ast, errors } = parse(this.preprocessResult.source);
    this.ast = ast;
    this.errors = errors;

    if (errors.length > 0) {
      for (const e of errors) this.callbacks.onError(e);
    }

    // Process #DEFINE_CONSTANT
    for (const d of ast.defines) {
      this.constants.set(d.name, d.value);
    }

    // Set up I/O maps from declarations
    for (const decl of ast.ioDecls) {
      const count = decl.arraySize ?? 1;
      for (const name of decl.names) {
        if (count > 1) {
          for (let i = 1; i <= count; i++) {
            this.registerIO(decl.ioType, `${name}[${i}]`);
          }
        } else {
          this.registerIO(decl.ioType, name);
        }
      }
    }

    // Register structure definitions
    for (const s of ast.structures) {
      this.structureDefs.set(s.name.toUpperCase(), s);
    }

    // Set up global variables with type tracking
    for (const v of ast.varDecls) {
      const varType = v.varType.toUpperCase();
      for (const { name, arraySize } of v.names) {
        if (this.structureDefs.has(varType)) {
          const structDef = this.structureDefs.get(varType)!;
          for (const field of structDef.fields) {
            const key = `${name}.${field.name}`;
            const isStr = field.type === "STRING";
            if (field.arraySize) {
              for (let i = 0; i <= field.arraySize; i++) {
                this.variables.set(`${key}[${i}]`, isStr ? "" : 0);
                this.typeInfo.set(`${key}[${i}]`, field.type);
              }
            } else {
              this.variables.set(key, isStr ? "" : 0);
              this.typeInfo.set(key, field.type);
            }
          }
          this.typeInfo.set(name, varType);
        } else if (arraySize) {
          for (let i = 0; i <= arraySize; i++) {
            const key = `${name}[${i}]`;
            this.variables.set(key, varType === "STRING" ? "" : 0);
            this.typeInfo.set(key, varType);
          }
        } else {
          this.variables.set(name, varType === "STRING" ? "" : 0);
          this.typeInfo.set(name, varType);
        }
      }
    }

    // Register event handlers and functions
    this.eventHandlers = ast.eventHandlers;
    for (const fn of ast.functions) {
      this.functions.set(fn.name.toUpperCase(), fn);
    }

    // System constants
    this.constants.set("SYSTEM_NAME", "SIMPL+ Playground");
    this.constants.set("SYSTEM_NUMBER", 1);
    this.constants.set("HOSTNAME", "SIMPL+ Playground");
    this.constants.set("PROGRAM_NAME", ast.symbolName || "Untitled");

    return { ioDecls: ast.ioDecls, errors };
  }

  private registerIO(ioType: IOType, name: string) {
    switch (ioType) {
      case "DIGITAL_INPUT": this.io.digitalInputs.set(name, 0); break;
      case "DIGITAL_OUTPUT": this.io.digitalOutputs.set(name, 0); break;
      case "ANALOG_INPUT": this.io.analogInputs.set(name, 0); break;
      case "ANALOG_OUTPUT": this.io.analogOutputs.set(name, 0); break;
      case "STRING_INPUT": this.io.stringInputs.set(name, ""); break;
      case "STRING_OUTPUT": this.io.stringOutputs.set(name, ""); break;
      case "BUFFER_INPUT": this.io.stringInputs.set(name, ""); break;
    }
  }

  reset() {
    this.stop();
    this.ast = null;
    this.io = {
      digitalInputs: new Map(),
      digitalOutputs: new Map(),
      analogInputs: new Map(),
      analogOutputs: new Map(),
      stringInputs: new Map(),
      stringOutputs: new Map(),
    };
    this.variables.clear();
    this.constants.clear();
    this.scopeStack = [];
    this.eventHandlers = [];
    this.functions.clear();
    this.typeInfo.clear();
    this.structureDefs.clear();
    this.lastModifiedIndex.clear();
    this.preprocessResult = null;
    this.vfs.reset();
    this.vnet.reset();
    this.criticalSections.clear();
    this.errors = [];
    this.steps = 0;
    this.breakFlag = false;
    this.returnFlag = false;
    this.returnValue = 0;
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    // Clear all wait timers
    for (const [, timer] of this.waitTimers) {
      clearTimeout(timer.id);
    }
    this.waitTimers.clear();
    this._isExecuting = false;
  }

  private checkAbort() {
    if (this.abortController?.signal.aborted) {
      throw new AbortError();
    }
  }

  async runMain(): Promise<void> {
    if (!this.ast?.mainFunction) return;
    this.abortController = new AbortController();
    this._isExecuting = true;
    this.steps = 0;
    this.breakFlag = false;
    this.returnFlag = false;
    this.callbacks.onConsoleOutput("Program started");
    try {
      await this.execFunction(this.ast.mainFunction, []);
    } catch (e) {
      if (e instanceof AbortError) {
        this.callbacks.onConsoleOutput("Program stopped by user");
      } else if (e instanceof StepLimitError) {
        this.callbacks.onError({ message: "Execution stopped: exceeded step limit (possible infinite loop)", line: 0 });
      } else {
        this.callbacks.onError({ message: String(e), line: 0 });
      }
    } finally {
      this._isExecuting = false;
    }
  }

  setDigitalInput(name: string, value: number) {
    const prev = this.io.digitalInputs.get(name) ?? 0;
    this.io.digitalInputs.set(name, value);

    if (prev === 0 && value === 1) this.fireEvent("PUSH", name);
    if (prev === 1 && value === 0) this.fireEvent("RELEASE", name);
  }

  setAnalogInput(name: string, value: number) {
    value = Math.max(0, Math.min(65535, Math.round(value)));
    const prev = this.io.analogInputs.get(name);
    this.io.analogInputs.set(name, value);
    if (prev !== value) this.fireEvent("CHANGE", name);
  }

  setStringInput(name: string, value: string) {
    const prev = this.io.stringInputs.get(name);
    this.io.stringInputs.set(name, value);
    if (prev !== value) this.fireEvent("CHANGE", name);
  }

  private fireEvent(eventType: string, signalName: string) {
    // Also match array handlers: CHANGE on "arr[5]" should match handler for "arr"
    const baseName = signalName.replace(/\[\d+\]$/, "");
    const handlers = this.eventHandlers.filter(
      h => h.eventType === eventType && (
        h.signalName.toUpperCase() === signalName.toUpperCase() ||
        h.signalName.toUpperCase() === baseName.toUpperCase()
      )
    );
    for (const handler of handlers) {
      this.steps = 0;
      this.breakFlag = false;
      this.returnFlag = false;
      try {
        // Event handlers run synchronously (no await) to match SIMPL+ behavior for I/O events
        this.execBlockSync(handler.body);
      } catch (e) {
        if (e instanceof TerminateEventError) {
          // TERMINATEEVENT — silently exit this handler
        } else if (e instanceof StepLimitError) {
          this.callbacks.onError({ message: `Event handler ${eventType} ${signalName}: exceeded step limit`, line: handler.line });
        } else if (e instanceof AbortError) {
          // Stopped
        } else {
          this.callbacks.onError({ message: `Event handler error: ${e}`, line: handler.line });
        }
      }
    }
  }

  // ── Async execution (for Main and timing functions) ──

  private async execFunction(fn: FunctionDeclNode, args: (number | string)[]): Promise<number | string> {
    const scope = new Map<string, number | string>();
    fn.params.forEach((p, i) => scope.set(p.name, args[i] ?? 0));
    for (const v of fn.localVars) {
      for (const { name, arraySize } of v.names) {
        if (arraySize) {
          for (let i = 0; i <= arraySize; i++) scope.set(`${name}[${i}]`, v.varType === "STRING" ? "" : 0);
        } else {
          scope.set(name, v.varType === "STRING" ? "" : 0);
        }
      }
    }
    this.scopeStack.push(scope);

    this.returnFlag = false;
    this.returnValue = 0;
    await this.execBlock(fn.body);
    this.returnFlag = false;
    const result = this.returnValue;
    this.returnValue = 0;
    this.scopeStack.pop();
    return result;
  }

  private async execBlock(stmts: StatementNode[]): Promise<void> {
    for (const stmt of stmts) {
      if (this.breakFlag || this.returnFlag) break;
      this.checkAbort();
      await this.execStatement(stmt);
    }
  }

  private async execStatement(stmt: StatementNode): Promise<void> {
    if (++this.steps > MAX_STEPS) throw new StepLimitError();
    if (this.breakFlag || this.returnFlag) return;
    this.checkAbort();

    switch (stmt.kind) {
      case "assignment": {
        const value = await this.evalExpr(stmt.value);
        let target: string;
        if (stmt.index) {
          if (stmt.index.kind === "binaryExpr" && (stmt.index as any).op === "MULTIDIM") {
            const i = await this.evalExpr(stmt.index.left);
            const j = await this.evalExpr(stmt.index.right);
            target = `${stmt.target}[${i}][${j}]`;
          } else if (stmt.target.includes(".") && stmt.target.includes("[__idx__]")) {
            const baseName = stmt.target.replace("[__idx__]", "");
            target = `${baseName}[${await this.evalExpr(stmt.index)}]`;
          } else {
            target = `${stmt.target}[${await this.evalExpr(stmt.index)}]`;
          }
        } else {
          target = stmt.target;
        }
        this.setVariable(target, value);
        break;
      }
      case "call": {
        const args: (number | string)[] = [];
        for (const a of stmt.args) args.push(await this.evalExpr(a));
        await this.callFunctionAsync(stmt.name, args);
        break;
      }
      case "if": {
        const cond = await this.evalExpr(stmt.condition);
        if (this.isTruthy(cond)) {
          await this.execBlock(stmt.thenBody);
        } else {
          await this.execBlock(stmt.elseBody);
        }
        break;
      }
      case "for": {
        const from = Number(await this.evalExpr(stmt.from));
        const to = Number(await this.evalExpr(stmt.to));
        const step = stmt.step ? Number(await this.evalExpr(stmt.step)) : 1;
        if (step === 0) break;
        this.setVariable(stmt.variable, from);
        const goUp = step > 0;
        while (true) {
          if (this.breakFlag || this.returnFlag) break;
          this.checkAbort();
          const cur = Number(this.getVariable(stmt.variable));
          if (goUp ? cur > to : cur < to) break;
          await this.execBlock(stmt.body);
          if (this.breakFlag) { this.breakFlag = false; break; }
          this.setVariable(stmt.variable, cur + step);
        }
        break;
      }
      case "while": {
        while (this.isTruthy(await this.evalExpr(stmt.condition))) {
          if (this.breakFlag || this.returnFlag) break;
          this.checkAbort();
          await this.execBlock(stmt.body);
          if (this.breakFlag) { this.breakFlag = false; break; }
          if (++this.steps > MAX_STEPS) throw new StepLimitError();
        }
        break;
      }
      case "doUntil": {
        do {
          if (this.breakFlag || this.returnFlag) break;
          this.checkAbort();
          await this.execBlock(stmt.body);
          if (this.breakFlag) { this.breakFlag = false; break; }
          if (++this.steps > MAX_STEPS) throw new StepLimitError();
        } while (!this.isTruthy(await this.evalExpr(stmt.condition)));
        break;
      }
      case "switch": {
        const val = await this.evalExpr(stmt.expr);
        let matched = false;
        for (const c of stmt.cases) {
          if (c.value === null) {
            if (!matched || !stmt.usesCswitch) {
              await this.execBlock(c.body);
              matched = true;
            }
            break;
          }
          const caseVal = await this.evalExpr(c.value);
          if (val === caseVal || Number(val) === Number(caseVal)) {
            await this.execBlock(c.body);
            matched = true;
            if (stmt.usesCswitch) continue;
            break;
          }
        }
        this.breakFlag = false;
        break;
      }
      case "return": {
        if (stmt.value) this.returnValue = await this.evalExpr(stmt.value);
        this.returnFlag = true;
        break;
      }
      case "break": {
        this.breakFlag = true;
        break;
      }
      case "wait": {
        const duration = Number(await this.evalExpr(stmt.duration));
        const label = stmt.label || `__wait_${Date.now()}`;
        if (stmt.body.length > 0) {
          // Named WAIT with body — schedule body for later execution
          const ms = duration * 10; // hundredths of a second
          this.callbacks.onConsoleOutput(`[WAIT] Scheduling "${label}" in ${ms}ms`);
          const bodyRef = stmt.body;
          const timerId = setTimeout(async () => {
            this.waitTimers.delete(label);
            try {
              await this.execBlock(bodyRef);
            } catch (e) {
              if (!(e instanceof AbortError)) {
                this.callbacks.onError({ message: `WAIT "${label}" error: ${e}`, line: stmt.line });
              }
            }
          }, ms);
          this.waitTimers.set(label, { id: timerId, resolve: () => {} });
        } else {
          // Inline DELAY-style WAIT — pause execution
          const ms = duration * 10;
          this.callbacks.onConsoleOutput(`[DELAY] Pausing ${ms}ms`);
          await this.delay(ms);
        }
        break;
      }
    }
  }

  // ── Synchronous execution (for event handlers triggered by I/O) ──

  private execBlockSync(stmts: StatementNode[]) {
    for (const stmt of stmts) {
      if (this.breakFlag || this.returnFlag) break;
      this.execStatementSync(stmt);
    }
  }

  private execFunctionSync(fn: FunctionDeclNode, args: (number | string)[]): number | string {
    const scope = new Map<string, number | string>();
    fn.params.forEach((p, i) => scope.set(p.name, args[i] ?? 0));
    for (const v of fn.localVars) {
      for (const { name, arraySize } of v.names) {
        if (arraySize) {
          for (let i = 0; i <= arraySize; i++) scope.set(`${name}[${i}]`, v.varType === "STRING" ? "" : 0);
        } else {
          scope.set(name, v.varType === "STRING" ? "" : 0);
        }
      }
    }
    this.scopeStack.push(scope);
    this.returnFlag = false;
    this.returnValue = 0;
    this.execBlockSync(fn.body);
    this.returnFlag = false;
    const result = this.returnValue;
    this.returnValue = 0;
    this.scopeStack.pop();
    return result;
  }

  private execStatementSync(stmt: StatementNode) {
    if (++this.steps > MAX_STEPS) throw new StepLimitError();
    if (this.breakFlag || this.returnFlag) return;

    switch (stmt.kind) {
      case "assignment": {
        const value = this.evalExprSync(stmt.value);
        let target: string;
        if (stmt.index) {
          if (stmt.index.kind === "binaryExpr" && (stmt.index as any).op === "MULTIDIM") {
            const i = this.evalExprSync(stmt.index.left);
            const j = this.evalExprSync(stmt.index.right);
            target = `${stmt.target}[${i}][${j}]`;
          } else if (stmt.target.includes(".") && stmt.target.includes("[__idx__]")) {
            const baseName = stmt.target.replace("[__idx__]", "");
            target = `${baseName}[${this.evalExprSync(stmt.index)}]`;
          } else {
            target = `${stmt.target}[${this.evalExprSync(stmt.index)}]`;
          }
        } else {
          target = stmt.target;
        }
        this.setVariable(target, value);
        break;
      }
      case "call": {
        const args = stmt.args.map(a => this.evalExprSync(a));
        this.callFunctionSync(stmt.name, args);
        break;
      }
      case "if": {
        const cond = this.evalExprSync(stmt.condition);
        if (this.isTruthy(cond)) this.execBlockSync(stmt.thenBody);
        else this.execBlockSync(stmt.elseBody);
        break;
      }
      case "for": {
        const from = Number(this.evalExprSync(stmt.from));
        const to = Number(this.evalExprSync(stmt.to));
        const step = stmt.step ? Number(this.evalExprSync(stmt.step)) : 1;
        if (step === 0) break;
        this.setVariable(stmt.variable, from);
        const goUp = step > 0;
        while (true) {
          if (this.breakFlag || this.returnFlag) break;
          const cur = Number(this.getVariable(stmt.variable));
          if (goUp ? cur > to : cur < to) break;
          this.execBlockSync(stmt.body);
          if (this.breakFlag) { this.breakFlag = false; break; }
          this.setVariable(stmt.variable, cur + step);
        }
        break;
      }
      case "while": {
        while (this.isTruthy(this.evalExprSync(stmt.condition))) {
          if (this.breakFlag || this.returnFlag) break;
          this.execBlockSync(stmt.body);
          if (this.breakFlag) { this.breakFlag = false; break; }
          if (++this.steps > MAX_STEPS) throw new StepLimitError();
        }
        break;
      }
      case "doUntil": {
        do {
          if (this.breakFlag || this.returnFlag) break;
          this.execBlockSync(stmt.body);
          if (this.breakFlag) { this.breakFlag = false; break; }
          if (++this.steps > MAX_STEPS) throw new StepLimitError();
        } while (!this.isTruthy(this.evalExprSync(stmt.condition)));
        break;
      }
      case "switch": {
        const val = this.evalExprSync(stmt.expr);
        let matched = false;
        for (const c of stmt.cases) {
          if (c.value === null) {
            if (!matched || !stmt.usesCswitch) { this.execBlockSync(c.body); matched = true; }
            break;
          }
          const caseVal = this.evalExprSync(c.value);
          if (val === caseVal || Number(val) === Number(caseVal)) {
            this.execBlockSync(c.body);
            matched = true;
            if (stmt.usesCswitch) continue;
            break;
          }
        }
        this.breakFlag = false;
        break;
      }
      case "return": {
        if (stmt.value) this.returnValue = this.evalExprSync(stmt.value);
        this.returnFlag = true;
        break;
      }
      case "break": {
        this.breakFlag = true;
        break;
      }
      case "wait": {
        const duration = Number(this.evalExprSync(stmt.duration));
        this.callbacks.onConsoleOutput(`[WAIT] ${stmt.label || "inline"}: ${duration} hundredths (sync — no delay in event handler)`);
        this.execBlockSync(stmt.body);
        break;
      }
    }
  }

  // ── Async expression evaluation ──

  private async evalExpr(expr: ExpressionNode): Promise<number | string> {
    if (++this.steps > MAX_STEPS) throw new StepLimitError();
    this.checkAbort();

    switch (expr.kind) {
      case "numberLiteral": return expr.value;
      case "stringLiteral": return expr.value;
      case "identifier": return this.getVariable(expr.name);
      case "indexExpr": {
        if (expr.indices && expr.indices.length > 1) {
          const parts: (number | string)[] = [];
          for (const idx of expr.indices) parts.push(await this.evalExpr(idx));
          return this.getVariable(`${expr.name}${parts.map(i => `[${i}]`).join("")}`);
        }
        const idx = await this.evalExpr(expr.index);
        return this.getVariable(`${expr.name}[${idx}]`);
      }
      case "dotAccess": {
        const key = expr.index
          ? `${expr.object}.${expr.field}[${await this.evalExpr(expr.index)}]`
          : `${expr.object}.${expr.field}`;
        return this.getVariable(key);
      }
      case "binaryExpr": {
        const left = await this.evalExpr(expr.left);
        const right = await this.evalExpr(expr.right);
        return this.evalBinaryOp(expr.op, left, right);
      }
      case "unaryExpr": {
        const operand = await this.evalExpr(expr.operand);
        if (expr.op === "-") return -Number(operand);
        if (expr.op === "!") return this.isTruthy(operand) ? 0 : 1;
        if (expr.op === "BNOT") return ~Number(operand);
        return operand;
      }
      case "callExpr": {
        const args: (number | string)[] = [];
        for (const a of expr.args) args.push(await this.evalExpr(a));
        return await this.callFunctionAsync(expr.name, args);
      }
    }
    return 0;
  }

  // ── Sync expression evaluation ──

  private evalExprSync(expr: ExpressionNode): number | string {
    if (++this.steps > MAX_STEPS) throw new StepLimitError();

    switch (expr.kind) {
      case "numberLiteral": return expr.value;
      case "stringLiteral": return expr.value;
      case "identifier": return this.getVariable(expr.name);
      case "indexExpr": {
        if (expr.indices && expr.indices.length > 1) {
          const parts = expr.indices.map(idx => this.evalExprSync(idx));
          return this.getVariable(`${expr.name}${parts.map(i => `[${i}]`).join("")}`);
        }
        const idx = this.evalExprSync(expr.index);
        return this.getVariable(`${expr.name}[${idx}]`);
      }
      case "dotAccess": {
        const key = expr.index
          ? `${expr.object}.${expr.field}[${this.evalExprSync(expr.index)}]`
          : `${expr.object}.${expr.field}`;
        return this.getVariable(key);
      }
      case "binaryExpr": {
        const left = this.evalExprSync(expr.left);
        const right = this.evalExprSync(expr.right);
        return this.evalBinaryOp(expr.op, left, right);
      }
      case "unaryExpr": {
        const operand = this.evalExprSync(expr.operand);
        if (expr.op === "-") return -Number(operand);
        if (expr.op === "!") return this.isTruthy(operand) ? 0 : 1;
        if (expr.op === "BNOT") return ~Number(operand);
        return operand;
      }
      case "callExpr": {
        const args = expr.args.map(a => this.evalExprSync(a));
        return this.callFunctionSync(expr.name, args);
      }
    }
    return 0;
  }

  // ── Binary operations ──

  private evalBinaryOp(op: string, left: number | string, right: number | string): number | string {
    if (op === "+" && (typeof left === "string" || typeof right === "string")) {
      return String(left) + String(right);
    }
    const l = Number(left) || 0;
    const r = Number(right) || 0;
    switch (op) {
      case "+": return l + r;
      case "-": return l - r;
      case "*": return l * r;
      case "/": return r !== 0 ? Math.trunc(l / r) : 0;
      case "%": return r !== 0 ? l % r : 0;
      case "==": return (left === right || l === r) ? 1 : 0;
      case "!=": return (left !== right && l !== r) ? 1 : 0;
      case "<": return l < r ? 1 : 0;
      case ">": return l > r ? 1 : 0;
      case "<=": return l <= r ? 1 : 0;
      case ">=": return l >= r ? 1 : 0;
      case "&&": return (this.isTruthy(left) && this.isTruthy(right)) ? 1 : 0;
      case "||": return (this.isTruthy(left) || this.isTruthy(right)) ? 1 : 0;
      case "<<": return l << r;
      case ">>": return l >> r;
      case "BAND": return l & r;
      case "BOR": return l | r;
      case "BXOR": return l ^ r;
      default: return 0;
    }
  }

  // ── Function calls ──

  private async callFunctionAsync(name: string, args: (number | string)[]): Promise<number | string> {
    const upper = name.toUpperCase();
    const fn = this.functions.get(upper);
    if (fn) return await this.execFunction(fn, args);

    if (upper === "TERMINATEEVENT") throw new TerminateEventError();

    // Timing builtins with async behavior
    if (upper === "DELAY") {
      const ms = (Number(args[0]) || 0) * 10;
      this.callbacks.onConsoleOutput(`[DELAY] Pausing ${ms}ms`);
      await this.delay(ms);
      return 0;
    }
    if (upper === "PULSE") {
      const duration = (Number(args[0]) || 0) * 10;
      const signalName = String(args[1] ?? "");
      if (signalName && this.io.digitalOutputs.has(signalName)) {
        this.setVariable(signalName, 1);
        setTimeout(() => {
          this.setVariable(signalName, 0);
        }, duration);
      }
      return 0;
    }
    if (upper === "CANCELWAIT") {
      const label = String(args[0] ?? "");
      const timer = this.waitTimers.get(label);
      if (timer) {
        clearTimeout(timer.id);
        this.waitTimers.delete(label);
        this.callbacks.onConsoleOutput(`[CANCELWAIT] Cancelled "${label}"`);
      }
      return 0;
    }
    if (upper === "CANCELALLWAIT") {
      for (const [label, timer] of this.waitTimers) {
        clearTimeout(timer.id);
        this.callbacks.onConsoleOutput(`[CANCELALLWAIT] Cancelled "${label}"`);
      }
      this.waitTimers.clear();
      return 0;
    }
    if (upper === "RETIMEWAIT") {
      const newDuration = (Number(args[0]) || 0) * 10;
      const label = String(args[1] ?? "");
      const timer = this.waitTimers.get(label);
      if (timer) {
        clearTimeout(timer.id);
        const newId = setTimeout(timer.resolve, newDuration);
        this.waitTimers.set(label, { id: newId, resolve: timer.resolve });
        this.callbacks.onConsoleOutput(`[RETIMEWAIT] "${label}" retimed to ${newDuration}ms`);
      }
      return 0;
    }
    if (upper === "PROCESSLOGIC") {
      // Yield to event loop
      await new Promise(r => setTimeout(r, 0));
      return 0;
    }
    if (upper === "CREATETHREAD") {
      const fnName = String(args[0] ?? "").toUpperCase();
      const fn = this.functions.get(fnName);
      if (fn) {
        setTimeout(async () => {
          try { await this.execFunction(fn, []); } catch (_) { /* swallow */ }
        }, 0);
      }
      return 0;
    }
    if (upper === "CRITICALSECTION_BEGIN") {
      const name = String(args[0] ?? "default");
      while (this.criticalSections.get(name)) {
        await new Promise(r => setTimeout(r, 10));
        this.checkAbort();
      }
      this.criticalSections.set(name, true);
      return 0;
    }
    if (upper === "CRITICALSECTION_END") {
      this.criticalSections.set(String(args[0] ?? "default"), false);
      return 0;
    }

    // ── VFS file operations ──
    const vfsResult = this.handleVFSCall(upper, args);
    if (vfsResult !== undefined) return vfsResult;

    // ── VNet socket operations ──
    const vnetResult = this.handleVNetCall(upper, args);
    if (vnetResult !== undefined) return vnetResult;

    return callBuiltin(name, args, {
      print: (msg) => this.callbacks.onConsoleOutput(msg),
      getVar: (n) => this.getVariable(n),
      setVar: (n, v) => this.setVariable(n, v),
      getLastModifiedArrayIndex: (n) => this.getLastModifiedArrayIndex(n),
    });
  }

  private callFunctionSync(name: string, args: (number | string)[]): number | string {
    const upper = name.toUpperCase();
    const fn = this.functions.get(upper);
    if (fn) return this.execFunctionSync(fn, args);

    if (upper === "TERMINATEEVENT") throw new TerminateEventError();
    if (upper === "DELAY" || upper === "PULSE" || upper === "PROCESSLOGIC") {
      // Timing builtins are no-ops in sync mode (event handlers)
      return 0;
    }
    if (upper === "CANCELWAIT") {
      const label = String(args[0] ?? "");
      const timer = this.waitTimers.get(label);
      if (timer) { clearTimeout(timer.id); this.waitTimers.delete(label); }
      return 0;
    }
    if (upper === "CANCELALLWAIT") {
      for (const [, timer] of this.waitTimers) clearTimeout(timer.id);
      this.waitTimers.clear();
      return 0;
    }
    if (upper === "CREATETHREAD" || upper === "CRITICALSECTION_BEGIN" || upper === "CRITICALSECTION_END") {
      return 0; // no-op in sync context
    }

    const vfsResult = this.handleVFSCall(upper, args);
    if (vfsResult !== undefined) return vfsResult;

    const vnetResult = this.handleVNetCall(upper, args);
    if (vnetResult !== undefined) return vnetResult;

    return callBuiltin(name, args, {
      print: (msg) => this.callbacks.onConsoleOutput(msg),
      getVar: (n) => this.getVariable(n),
      setVar: (n, v) => this.setVariable(n, v),
      getLastModifiedArrayIndex: (n) => this.getLastModifiedArrayIndex(n),
    });
  }

  // ── Timing helpers ──

  private delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = setTimeout(resolve, ms);
      // Listen for abort
      this.abortController?.signal.addEventListener("abort", () => {
        clearTimeout(id);
        reject(new AbortError());
      }, { once: true });
    });
  }

  // ── Variable access ──

  private getVariable(name: string): number | string {
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      const v = this.scopeStack[i].get(name);
      if (v !== undefined) return v;
    }
    if (this.variables.has(name)) return this.variables.get(name)!;
    if (this.constants.has(name)) return this.constants.get(name)!;
    if (this.io.digitalInputs.has(name)) return this.io.digitalInputs.get(name)!;
    if (this.io.digitalOutputs.has(name)) return this.io.digitalOutputs.get(name)!;
    if (this.io.analogInputs.has(name)) return this.io.analogInputs.get(name)!;
    if (this.io.analogOutputs.has(name)) return this.io.analogOutputs.get(name)!;
    if (this.io.stringInputs.has(name)) return this.io.stringInputs.get(name)!;
    if (this.io.stringOutputs.has(name)) return this.io.stringOutputs.get(name)!;
    return 0;
  }

  private applyTypeWrap(name: string, value: number | string): number | string {
    if (typeof value === "string") return value;
    const type = this.typeInfo.get(name);
    if (!type) return value;
    switch (type) {
      case "INTEGER": return wrapInteger(value);
      case "LONG_INTEGER": return wrapLongInteger(value);
      case "SIGNED_INTEGER": return wrapSignedInteger(value);
      case "SIGNED_LONG_INTEGER": return wrapSignedLongInteger(value);
      default: return value;
    }
  }

  private setVariable(name: string, value: number | string) {
    value = this.applyTypeWrap(name, value);

    const bracketMatch = name.match(/^(.+)\[(\d+)\]$/);
    if (bracketMatch) {
      this.lastModifiedIndex.set(bracketMatch[1], parseInt(bracketMatch[2], 10));
    }

    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      if (this.scopeStack[i].has(name)) {
        this.scopeStack[i].set(name, value);
        return;
      }
    }

    if (this.io.digitalOutputs.has(name)) {
      const numVal = Number(value) ? 1 : 0;
      this.io.digitalOutputs.set(name, numVal);
      this.callbacks.onOutputChange("digital", name, numVal);
      return;
    }
    if (this.io.analogOutputs.has(name)) {
      const numVal = Math.max(0, Math.min(65535, Math.round(Number(value) || 0)));
      this.io.analogOutputs.set(name, numVal);
      this.callbacks.onOutputChange("analog", name, numVal);
      return;
    }
    if (this.io.stringOutputs.has(name)) {
      const strVal = String(value);
      this.io.stringOutputs.set(name, strVal);
      this.callbacks.onOutputChange("string", name, strVal);
      return;
    }

    if (this.variables.has(name)) {
      this.variables.set(name, value);
      return;
    }

    this.variables.set(name, value);
  }

  // ── VFS file operation handler ──

  private handleVFSCall(upper: string, args: (number | string)[]): number | string | undefined {
    switch (upper) {
      case "FILEOPEN": {
        const path = String(args[0] ?? "");
        const mode = Number(args[1]) || 1;
        const handle = this.vfs.fileOpen(path, mode);
        this.callbacks.onConsoleOutput(`[VFS] FileOpen("${path}", mode=${mode}) => handle ${handle}`);
        return handle;
      }
      case "FILECLOSE": {
        const handle = Number(args[0]) || 0;
        this.vfs.fileClose(handle);
        return 0;
      }
      case "FILEREAD": {
        const handle = Number(args[0]) || 0;
        const destName = String(args[1] ?? "");
        const maxBytes = Number(args[2]) || 256;
        const data = this.vfs.fileRead(handle, maxBytes);
        if (destName) this.setVariable(destName, data);
        return data.length;
      }
      case "FILEWRITE": {
        const handle = Number(args[0]) || 0;
        const data = String(args[1] ?? "");
        return this.vfs.fileWrite(handle, data);
      }
      case "FILESEEK": {
        const handle = Number(args[0]) || 0;
        const pos = Number(args[1]) || 0;
        return this.vfs.fileSeek(handle, pos);
      }
      case "FILEDELETE": {
        const path = String(args[0] ?? "");
        return this.vfs.fileDelete(path);
      }
      case "FILELEN": {
        const path = String(args[0] ?? "");
        return this.vfs.fileLen(path);
      }
      case "ISFILE": return this.vfs.isFile(String(args[0] ?? "")) ? 1 : 0;
      case "ISDIRECTORY": return this.vfs.isDirectory(String(args[0] ?? "")) ? 1 : 0;
      case "MAKEDIRECTORY": {
        this.vfs.makeDirectory(String(args[0] ?? ""));
        return 0;
      }
      case "FINDFIRST": {
        const pattern = String(args[0] ?? "*");
        const dir = String(args[1] ?? "/");
        const { session, fileName } = this.vfs.findFirst(pattern, dir);
        if (session >= 0 && args[2] !== undefined) {
          this.setVariable(String(args[2]), fileName);
        }
        return session;
      }
      case "FINDNEXT": {
        const session = Number(args[0]) || 0;
        return this.vfs.findNext(session);
      }
      case "FINDCLOSE": {
        this.vfs.findClose(Number(args[0]) || 0);
        return 0;
      }
      case "STARTFILETRANSFER": {
        this.callbacks.onConsoleOutput("[VFS] StartFileTransfer — simulated (no-op)");
        return 0;
      }
      default: return undefined;
    }
  }

  // ── VNet socket operation handler ──

  private handleVNetCall(upper: string, args: (number | string)[]): number | string | undefined {
    switch (upper) {
      case "SOCKETCONNECTTCP": {
        const addr = String(args[0] ?? "");
        const port = Number(args[1]) || 23;
        const id = this.vnet.socketConnectTcp(addr, port);
        this.callbacks.onConsoleOutput(`[NET] SocketConnectTCP("${addr}", ${port}) => socket ${id}`);
        return id;
      }
      case "SOCKETDISCONNECT": {
        const id = Number(args[0]) || 0;
        this.vnet.socketDisconnect(id);
        return 0;
      }
      case "SOCKETSEND": {
        const id = Number(args[0]) || 0;
        const data = String(args[1] ?? "");
        return this.vnet.socketSend(id, data);
      }
      case "SOCKETGETSTATUS": {
        return this.vnet.socketGetStatus(Number(args[0]) || 0);
      }
      case "SOCKETGETADDRESS": {
        return this.vnet.socketGetAddress(Number(args[0]) || 0);
      }
      case "SOCKETGETREMOTEIPADDRESS": {
        return this.vnet.socketGetRemoteIpAddress(Number(args[0]) || 0);
      }
      case "SOCKETSERVERSTARTLISTEN": {
        const port = Number(args[0]) || 0;
        return this.vnet.socketServerStartListen(port);
      }
      default: return undefined;
    }
  }

  getLastModifiedArrayIndex(arrayName: string): number {
    return this.lastModifiedIndex.get(arrayName) ?? 0;
  }

  private isTruthy(v: number | string): boolean {
    if (typeof v === "string") return v.length > 0;
    return v !== 0;
  }
}

class StepLimitError extends Error {
  constructor() { super("Step limit exceeded"); }
}

class TerminateEventError extends Error {
  constructor() { super("TERMINATEEVENT"); }
}

class AbortError extends Error {
  constructor() { super("Execution aborted"); }
}
