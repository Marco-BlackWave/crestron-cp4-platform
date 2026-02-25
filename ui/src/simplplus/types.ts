// ── Token types ──

export type TokenType =
  | "keyword" | "ioType" | "varType" | "builtin" | "directive"
  | "identifier" | "number" | "string"
  | "operator" | "punctuation" | "comment"
  | "newline" | "eof";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

// ── AST nodes ──

export type ASTNode =
  | ProgramNode | IODeclNode | VarDeclNode | DefineConstantNode
  | EventHandlerNode | FunctionDeclNode | StructureDeclNode
  | IfNode | ForNode | WhileNode | DoUntilNode | SwitchNode | WaitNode
  | AssignmentNode | CallNode | ReturnNode | BreakNode
  | ExpressionNode;

export interface DirectiveNode {
  name: string;
  value: string;
  line: number;
}

export interface ProgramNode {
  kind: "program";
  symbolName: string;
  directives: DirectiveNode[];
  defines: DefineConstantNode[];
  ioDecls: IODeclNode[];
  varDecls: VarDeclNode[];
  structures: StructureDeclNode[];
  eventHandlers: EventHandlerNode[];
  functions: FunctionDeclNode[];
  mainFunction: FunctionDeclNode | null;
}

export type IODirection = "input" | "output";
export type IOType =
  | "DIGITAL_INPUT" | "DIGITAL_OUTPUT"
  | "ANALOG_INPUT" | "ANALOG_OUTPUT"
  | "STRING_INPUT" | "STRING_OUTPUT"
  | "BUFFER_INPUT";

export interface IODeclNode {
  kind: "ioDecl";
  ioType: IOType;
  names: string[];
  arraySize?: number;
  line: number;
}

export interface VarDeclNode {
  kind: "varDecl";
  varType: string;
  names: { name: string; arraySize?: number; initSize?: number }[];
  line: number;
}

export interface DefineConstantNode {
  kind: "defineConstant";
  name: string;
  value: string | number;
  line: number;
}

export interface StructureDeclNode {
  kind: "structureDecl";
  name: string;
  fields: { name: string; type: string; arraySize?: number }[];
  line: number;
}

export type EventType = "PUSH" | "RELEASE" | "CHANGE" | "SOCKETCONNECT" | "SOCKETDISCONNECT" | "SOCKETRECEIVE";

export interface EventHandlerNode {
  kind: "eventHandler";
  eventType: EventType;
  signalName: string;
  body: StatementNode[];
  line: number;
}

export interface FunctionDeclNode {
  kind: "functionDecl";
  name: string;
  returnType: "void" | "integer" | "string";
  params: { name: string; type: string }[];
  localVars: VarDeclNode[];
  body: StatementNode[];
  line: number;
}

// ── Statement nodes ──

export type StatementNode =
  | IfNode | ForNode | WhileNode | DoUntilNode | SwitchNode | WaitNode
  | AssignmentNode | CallNode | ReturnNode | BreakNode;

export interface IfNode {
  kind: "if";
  condition: ExpressionNode;
  thenBody: StatementNode[];
  elseBody: StatementNode[];
  line: number;
}

export interface ForNode {
  kind: "for";
  variable: string;
  from: ExpressionNode;
  to: ExpressionNode;
  step: ExpressionNode | null;
  body: StatementNode[];
  line: number;
}

export interface WhileNode {
  kind: "while";
  condition: ExpressionNode;
  body: StatementNode[];
  line: number;
}

export interface DoUntilNode {
  kind: "doUntil";
  condition: ExpressionNode;
  body: StatementNode[];
  line: number;
}

export interface SwitchNode {
  kind: "switch";
  usesCswitch: boolean;
  expr: ExpressionNode;
  cases: { value: ExpressionNode | null; body: StatementNode[] }[];
  line: number;
}

export interface AssignmentNode {
  kind: "assignment";
  target: string;
  index: ExpressionNode | null;
  value: ExpressionNode;
  line: number;
}

export interface CallNode {
  kind: "call";
  name: string;
  args: ExpressionNode[];
  line: number;
}

export interface ReturnNode {
  kind: "return";
  value: ExpressionNode | null;
  line: number;
}

export interface BreakNode {
  kind: "break";
  line: number;
}

export interface WaitNode {
  kind: "wait";
  duration: ExpressionNode;
  label: string;
  body: StatementNode[];
  line: number;
}

// ── Expression nodes ──

export type ExpressionNode =
  | BinaryExprNode | UnaryExprNode | CallExprNode
  | IdentifierExprNode | NumberLiteralNode | StringLiteralNode
  | IndexExprNode | DotAccessExprNode;

export interface BinaryExprNode {
  kind: "binaryExpr";
  op: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExprNode {
  kind: "unaryExpr";
  op: string;
  operand: ExpressionNode;
}

export interface CallExprNode {
  kind: "callExpr";
  name: string;
  args: ExpressionNode[];
}

export interface IdentifierExprNode {
  kind: "identifier";
  name: string;
}

export interface NumberLiteralNode {
  kind: "numberLiteral";
  value: number;
}

export interface StringLiteralNode {
  kind: "stringLiteral";
  value: string;
}

export interface IndexExprNode {
  kind: "indexExpr";
  name: string;
  index: ExpressionNode;
  indices: ExpressionNode[];
}

export interface DotAccessExprNode {
  kind: "dotAccess";
  object: string;
  field: string;
  index?: ExpressionNode;
}

// ── Runtime I/O state ──

export interface IOState {
  digitalInputs: Map<string, number>;
  digitalOutputs: Map<string, number>;
  analogInputs: Map<string, number>;
  analogOutputs: Map<string, number>;
  stringInputs: Map<string, string>;
  stringOutputs: Map<string, string>;
}

export interface ParseError {
  message: string;
  line: number;
  col?: number;
}
