export type JoinType = "digital" | "analog" | "serial";
export type ElementType = string;

export type Join = {
  type: JoinType;
  number: number;
  direction?: "input" | "output";
  name?: string;
  description?: string;
  value?: string | number | boolean;
  [key: string]: unknown;
};

export type CrestronElement = {
  id: string;
  type: ElementType;
  name?: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style?: Record<string, unknown>;
  joins?: Record<string, Join | unknown>;
  locked?: boolean;
  groupId?: string;
  children?: CrestronElement[];
  [key: string]: unknown;
};

export type Page = {
  id: string;
  name: string;
  elements: CrestronElement[];
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundAnimation?: string;
  backgroundSpeed?: number;
  backgroundIntensity?: number;
  animatedBackground?: unknown;
  [key: string]: unknown;
};

export type Template = {
  id: string;
  name: string;
  pages: Page[];
  [key: string]: unknown;
};

export type ExternalLibrary = {
  id: string;
  name: string;
  version?: string;
  installed?: boolean;
  components?: CrestronElement[];
  [key: string]: unknown;
};

export type Library = {
  id: string;
  name: string;
  components: CrestronElement[];
  [key: string]: unknown;
};

export type ComponentCategory = {
  id: string;
  name: string;
  items: CrestronElement[];
};

export type DevicePreset = {
  id: string;
  name: string;
  width: number;
  height: number;
  orientation?: "portrait" | "landscape";
};

export type Project = {
  name: string;
  pages: Page[];
  templates: Template[];
  libraries: Library[];
  externalLibraries?: ExternalLibrary[];
  [key: string]: unknown;
};

export type HistoryState = {
  project: Project;
  timestamp: number;
  action?: string;
};
