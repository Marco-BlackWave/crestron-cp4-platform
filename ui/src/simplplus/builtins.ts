// SIMPL+ built-in function implementations

type RuntimeCtx = {
  print: (msg: string) => void;
  getVar: (name: string) => number | string;
  setVar: (name: string, value: number | string) => void;
  getLastModifiedArrayIndex: (arrayName: string) => number;
};

// Gather state for GatherAsync — accumulates until delimiter found
const gatherBuffers: Map<string, string> = new Map();

function formatString(fmt: string, args: (number | string)[]): string {
  let result = "";
  let argIdx = 0;
  let i = 0;
  while (i < fmt.length) {
    if (fmt[i] === "%" && i + 1 < fmt.length) {
      i++;
      let zeroPad = false;
      let width = 0;
      if (fmt[i] === "0") { zeroPad = true; i++; }
      while (i < fmt.length && /[0-9]/.test(fmt[i])) {
        width = width * 10 + parseInt(fmt[i], 10);
        i++;
      }
      const spec = fmt[i] ?? "";
      const arg = args[argIdx++] ?? "";
      if (spec === "d" || spec === "i" || spec === "u") {
        let s = String(typeof arg === "number" ? arg : parseInt(String(arg), 10) || 0);
        if (zeroPad && width > 0) s = s.padStart(width, "0");
        else if (width > 0) s = s.padStart(width, " ");
        result += s;
      } else if (spec === "s") {
        let s = String(arg);
        if (width > 0) s = s.padEnd(width, " ");
        result += s;
      } else if (spec === "x" || spec === "X") {
        let s = (typeof arg === "number" ? arg : parseInt(String(arg), 10) || 0).toString(16);
        if (spec === "X") s = s.toUpperCase();
        if (zeroPad && width > 0) s = s.padStart(width, "0");
        result += s;
      } else if (spec === "%") {
        result += "%";
        argIdx--;
      } else {
        result += "%" + spec;
      }
      i++;
    } else if (fmt[i] === "\\" && i + 1 < fmt.length) {
      const esc = fmt[i + 1];
      if (esc === "n") { result += "\n"; i += 2; }
      else if (esc === "t") { result += "\t"; i += 2; }
      else if ((esc === "x" || esc === "X") && i + 3 < fmt.length) {
        const hex = fmt.substring(i + 2, i + 4);
        result += String.fromCharCode(parseInt(hex, 16) || 0);
        i += 4;
      } else {
        result += fmt[i];
        i++;
      }
    } else {
      result += fmt[i];
      i++;
    }
  }
  return result;
}

export function callBuiltin(
  name: string,
  args: (number | string)[],
  ctx: RuntimeCtx,
): number | string {
  const upper = name.toUpperCase();

  switch (upper) {
    // ══════════════ Output ══════════════
    case "PRINT": {
      const msg = args.length > 1 ? formatString(String(args[0]), args.slice(1)) : String(args[0] ?? "");
      ctx.print(msg);
      return 0;
    }
    case "TRACE": {
      const msg = args.length > 1 ? formatString(String(args[0]), args.slice(1)) : String(args[0] ?? "");
      ctx.print("[TRACE] " + msg);
      return 0;
    }
    case "MAKESTRING": {
      if (args.length >= 2) {
        const destName = String(args[0]);
        const formatted = args.length > 2
          ? formatString(String(args[1]), args.slice(2))
          : String(args[1]);
        ctx.setVar(destName, formatted);
        return formatted.length;
      }
      return 0;
    }

    // ══════════════ Conversion ══════════════
    case "ATOI": return parseInt(String(args[0] ?? ""), 10) || 0;
    case "ITOA": return String(args[0] ?? 0);
    case "ATOL": return parseInt(String(args[0] ?? ""), 10) || 0;
    case "LTOA": return String(args[0] ?? 0);
    case "CHR": return String.fromCharCode(Number(args[0]) || 0);
    case "BYTE": return (String(args[0] ?? "").charCodeAt(0)) || 0;

    // ══════════════ String ══════════════
    case "LEN": return String(args[0] ?? "").length;
    case "LEFT": return String(args[0] ?? "").substring(0, Number(args[1]) || 0);
    case "RIGHT": {
      const s = String(args[0] ?? "");
      const n = Number(args[1]) || 0;
      return s.substring(Math.max(0, s.length - n));
    }
    case "MID": {
      const s = String(args[0] ?? "");
      const start = (Number(args[1]) || 1) - 1;
      const len = Number(args[2]) || s.length;
      return s.substring(start, start + len);
    }
    case "FIND": {
      const needle = String(args[0] ?? "");
      const haystack = String(args[1] ?? "");
      const idx = haystack.indexOf(needle);
      return idx >= 0 ? idx + 1 : 0;
    }
    case "UPPER": return String(args[0] ?? "").toUpperCase();
    case "LOWER": return String(args[0] ?? "").toLowerCase();
    case "REMOVE": {
      const s = String(args[0] ?? "");
      const start = (Number(args[1]) || 1) - 1;
      const len = Number(args[2]) || 1;
      return s.substring(0, start) + s.substring(start + len);
    }
    case "SETSTRING": {
      // SetString(dest, destPos, source) — copy source into dest at position
      const destName = String(args[0] ?? "");
      const destPos = (Number(args[1]) || 1) - 1;
      const source = String(args[2] ?? "");
      const dest = String(ctx.getVar(destName));
      const padded = dest.padEnd(destPos, "\0");
      const result = padded.substring(0, destPos) + source + padded.substring(destPos + source.length);
      ctx.setVar(destName, result);
      return 0;
    }
    case "CLEARBUFFER": {
      // ClearBuffer(bufferName) — set to empty string
      const bufName = String(args[0] ?? "");
      ctx.setVar(bufName, "");
      return 0;
    }
    case "GETC": {
      // GetC(string) — get and remove first character
      const varName = String(args[0] ?? "");
      const s = String(ctx.getVar(varName));
      if (s.length === 0) return 0;
      ctx.setVar(varName, s.substring(1));
      return s.charCodeAt(0);
    }
    case "RESIZESTRING": {
      // ResizeString(string, newSize) — no-op in playground (JS strings are dynamic)
      return 0;
    }
    case "GATHERASYNC": {
      // GatherAsync(delimiter, buffer) — accumulate buffer data until delimiter found
      const delimiter = String(args[0] ?? "");
      const bufferName = String(args[1] ?? "");
      const incoming = String(ctx.getVar(bufferName));
      const existing = gatherBuffers.get(bufferName) ?? "";
      const combined = existing + incoming;
      const delimIdx = combined.indexOf(delimiter);
      if (delimIdx >= 0) {
        // Found delimiter — return gathered data up to and including delimiter
        const gathered = combined.substring(0, delimIdx + delimiter.length);
        gatherBuffers.set(bufferName, combined.substring(delimIdx + delimiter.length));
        ctx.setVar(bufferName, gathered);
        return 1; // success
      }
      gatherBuffers.set(bufferName, combined);
      return 0; // still gathering
    }
    case "GATHERBYLENGTH": {
      // GatherByLength(length, buffer) — accumulate until length bytes received
      const targetLen = Number(args[0]) || 0;
      const bufferName = String(args[1] ?? "");
      const incoming = String(ctx.getVar(bufferName));
      const existing = gatherBuffers.get(bufferName) ?? "";
      const combined = existing + incoming;
      if (combined.length >= targetLen) {
        ctx.setVar(bufferName, combined.substring(0, targetLen));
        gatherBuffers.set(bufferName, combined.substring(targetLen));
        return 1;
      }
      gatherBuffers.set(bufferName, combined);
      return 0;
    }

    // ══════════════ Math ══════════════
    case "MIN": return Math.min(Number(args[0]) || 0, Number(args[1]) || 0);
    case "MAX": return Math.max(Number(args[0]) || 0, Number(args[1]) || 0);
    case "ABS": return Math.abs(Number(args[0]) || 0);
    case "MULDIV": {
      const a = Number(args[0]) || 0;
      const b = Number(args[1]) || 0;
      const c = Number(args[2]) || 1;
      return c !== 0 ? Math.trunc((a * b) / c) : 0;
    }

    // ══════════════ Array ══════════════
    case "SETARRAY": {
      ctx.print(`[SETARRAY] Setting array elements`);
      return 0;
    }
    case "GETLASTMODIFIEDARRAYINDEX": {
      const arrayName = String(args[0] ?? "");
      return ctx.getLastModifiedArrayIndex(arrayName);
    }

    // ══════════════ Timing (handled by runtime for async) ══════════════
    case "DELAY": {
      ctx.print(`[DELAY] ${args[0] ?? 0} hundredths of a second`);
      return 0;
    }
    case "PULSE": {
      ctx.print(`[PULSE] ${args[0] ?? 0} hundredths on ${args[1] ?? "signal"}`);
      return 0;
    }
    case "PROCESSLOGIC": return 0;

    // ══════════════ Date / Time ══════════════
    case "GETDATENUM": return new Date().getDate();
    case "GETDAYOFWEEKNUM": return new Date().getDay();
    case "GETHOURNUM": return new Date().getHours();
    case "GETMINUTESNUM": return new Date().getMinutes();
    case "GETMONTHNUM": return new Date().getMonth() + 1;
    case "GETSECONDSNUM": return new Date().getSeconds();
    case "GETYEARNUM": return new Date().getFullYear();
    case "TIME": {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    }
    case "DATE": {
      const d = new Date();
      return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
    }
    case "DAY": {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return days[new Date().getDay()];
    }

    // ══════════════ System ══════════════
    case "ISSIGNALDEFINED": return 0;
    case "WAITFORINITIALIZATIONCOMPLETE": return 0;

    // ══════════════ File I/O (delegated to VFS in runtime) ══════════════
    case "FILEOPEN":
    case "FILECLOSE":
    case "FILEREAD":
    case "FILEWRITE":
    case "FILESEEK":
    case "FILEDELETE":
    case "FINDFIRST":
    case "FINDNEXT":
    case "FINDCLOSE":
    case "MAKEDIRECTORY":
    case "STARTFILETRANSFER":
    case "ISFILE":
    case "ISDIRECTORY":
    case "FILELEN":
      // These are handled by runtime directly when VFS is available
      return 0;

    // ══════════════ Sockets (delegated to VNet in runtime) ══════════════
    case "SOCKETCONNECTTCP":
    case "SOCKETDISCONNECT":
    case "SOCKETSEND":
    case "SOCKETGETADDRESS":
    case "SOCKETGETSTATUS":
    case "SOCKETGETREMOTEIPADDRESS":
    case "SOCKETSERVERSTARTLISTEN":
      return 0;

    default:
      return 0;
  }
}
