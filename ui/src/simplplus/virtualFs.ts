// Virtual File System — in-browser simulation of Crestron file I/O

export interface VFSEntry {
  path: string;
  isDirectory: boolean;
  content: Uint8Array;
  modified: number;
}

export interface OpenHandle {
  path: string;
  position: number;
  mode: "r" | "w" | "a" | "rw";
}

export interface FindSession {
  pattern: string;
  directory: string;
  results: string[];
  index: number;
}

export class VirtualFileSystem {
  private files: Map<string, VFSEntry> = new Map();
  private handles: Map<number, OpenHandle> = new Map();
  private findSessions: Map<number, FindSession> = new Map();
  private nextHandle = 1;
  private nextFindSession = 100;
  onChange: (() => void) | null = null;

  constructor() {
    this.reset();
  }

  reset() {
    this.files.clear();
    this.handles.clear();
    this.findSessions.clear();
    this.nextHandle = 1;
    this.nextFindSession = 100;

    // Pre-populate with some default files
    this.makeDirectory("/SYS");
    this.makeDirectory("/USER");
    this.writeFileRaw("/SYS/README.TXT", this.encode(
      "SIMPL+ Playground Virtual File System\r\n" +
      "=====================================\r\n" +
      "This is a simulated Crestron file system.\r\n" +
      "Files are stored in memory only.\r\n"
    ));
  }

  private encode(s: string): Uint8Array {
    return new TextEncoder().encode(s);
  }

  private decode(data: Uint8Array): string {
    return new TextDecoder().decode(data);
  }

  private normPath(path: string): string {
    let p = path.replace(/\\/g, "/");
    if (!p.startsWith("/")) p = "/" + p;
    // Remove trailing slash except for root
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p.toUpperCase();
  }

  private notify() {
    if (this.onChange) this.onChange();
  }

  // ── Directory operations ──

  makeDirectory(path: string): number {
    const norm = this.normPath(path);
    if (this.files.has(norm)) return 0; // already exists
    this.files.set(norm, {
      path: norm,
      isDirectory: true,
      content: new Uint8Array(0),
      modified: Date.now(),
    });
    this.notify();
    return 0;
  }

  isDirectory(path: string): boolean {
    const entry = this.files.get(this.normPath(path));
    return entry?.isDirectory ?? false;
  }

  isFile(path: string): boolean {
    const entry = this.files.get(this.normPath(path));
    return entry ? !entry.isDirectory : false;
  }

  // ── File operations ──

  fileOpen(path: string, mode: number): number {
    const norm = this.normPath(path);
    const modeStr = mode === 1 ? "r" : mode === 2 ? "w" : mode === 3 ? "a" : "rw";

    // Create file if writing and doesn't exist
    if (modeStr !== "r" && !this.files.has(norm)) {
      // Ensure parent directory exists
      const dir = norm.substring(0, norm.lastIndexOf("/")) || "/";
      if (!this.files.has(dir)) this.makeDirectory(dir);

      this.files.set(norm, {
        path: norm,
        isDirectory: false,
        content: new Uint8Array(0),
        modified: Date.now(),
      });
    }

    const entry = this.files.get(norm);
    if (!entry || entry.isDirectory) return -1; // error

    const handle = this.nextHandle++;
    const position = modeStr === "a" ? entry.content.length : 0;

    // If write mode (not append), truncate
    if (modeStr === "w") {
      entry.content = new Uint8Array(0);
      entry.modified = Date.now();
    }

    this.handles.set(handle, { path: norm, position, mode: modeStr });
    this.notify();
    return handle;
  }

  fileClose(handle: number): number {
    if (!this.handles.has(handle)) return -1;
    this.handles.delete(handle);
    return 0;
  }

  fileRead(handle: number, maxBytes: number): string {
    const h = this.handles.get(handle);
    if (!h) return "";
    const entry = this.files.get(h.path);
    if (!entry) return "";

    const available = entry.content.length - h.position;
    const toRead = Math.min(maxBytes, available);
    if (toRead <= 0) return "";

    const slice = entry.content.slice(h.position, h.position + toRead);
    h.position += toRead;
    return this.decode(slice);
  }

  fileWrite(handle: number, data: string): number {
    const h = this.handles.get(handle);
    if (!h) return -1;
    const entry = this.files.get(h.path);
    if (!entry) return -1;

    const encoded = this.encode(data);
    const newContent = new Uint8Array(Math.max(entry.content.length, h.position + encoded.length));
    newContent.set(entry.content);
    newContent.set(encoded, h.position);
    entry.content = newContent;
    entry.modified = Date.now();
    h.position += encoded.length;
    this.notify();
    return encoded.length;
  }

  fileSeek(handle: number, position: number): number {
    const h = this.handles.get(handle);
    if (!h) return -1;
    h.position = Math.max(0, position);
    return 0;
  }

  fileDelete(path: string): number {
    const norm = this.normPath(path);
    if (!this.files.has(norm)) return -1;
    this.files.delete(norm);
    this.notify();
    return 0;
  }

  fileLen(path: string): number {
    const entry = this.files.get(this.normPath(path));
    if (!entry || entry.isDirectory) return -1;
    return entry.content.length;
  }

  // ── Find operations ──

  findFirst(pattern: string, directory: string): { session: number; fileName: string } {
    const normDir = this.normPath(directory);
    const patternUpper = pattern.toUpperCase().replace(/\*/g, ".*").replace(/\?/g, ".");
    const regex = new RegExp("^" + patternUpper + "$");

    const results: string[] = [];
    for (const [path, entry] of this.files) {
      if (entry.isDirectory) continue;
      const dir = path.substring(0, path.lastIndexOf("/")) || "/";
      if (dir !== normDir) continue;
      const name = path.substring(path.lastIndexOf("/") + 1);
      if (regex.test(name)) results.push(name);
    }

    if (results.length === 0) return { session: -1, fileName: "" };

    const session = this.nextFindSession++;
    this.findSessions.set(session, { pattern, directory: normDir, results, index: 1 });
    return { session, fileName: results[0] };
  }

  findNext(session: number): string {
    const s = this.findSessions.get(session);
    if (!s || s.index >= s.results.length) return "";
    return s.results[s.index++];
  }

  findClose(session: number): void {
    this.findSessions.delete(session);
  }

  // ── Utility for UI ──

  writeFileRaw(path: string, content: Uint8Array) {
    const norm = this.normPath(path);
    this.files.set(norm, {
      path: norm,
      isDirectory: false,
      content,
      modified: Date.now(),
    });
    this.notify();
  }

  listFiles(): VFSEntry[] {
    return Array.from(this.files.values()).sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
  }

  getFileContent(path: string): string {
    const entry = this.files.get(this.normPath(path));
    if (!entry || entry.isDirectory) return "";
    return this.decode(entry.content);
  }

  getOpenHandles(): Map<number, OpenHandle> {
    return new Map(this.handles);
  }

  getStats(): { files: number; directories: number; totalBytes: number } {
    let files = 0, directories = 0, totalBytes = 0;
    for (const entry of this.files.values()) {
      if (entry.isDirectory) directories++;
      else { files++; totalBytes += entry.content.length; }
    }
    return { files, directories, totalBytes };
  }

  clearAll() {
    this.files.clear();
    this.handles.clear();
    this.findSessions.clear();
    this.reset();
    this.notify();
  }
}
