// SIMPL+ Preprocessor — handles #IF_DEFINED, #HELP, and other directives

export interface PreprocessResult {
  source: string;
  helpText: string;
  defines: Set<string>;
  info: string[];
}

/**
 * Process SIMPL+ preprocessor directives before parsing.
 * - #IF_DEFINED / #IF_NOT_DEFINED / #ENDIF — conditional compilation
 * - #HELP_BEGIN / #HELP_END — extract help text
 * - #PRINT_TO_TRACE — noted in info
 * - #DIGITAL_EXPAND / #ANALOG_SERIAL_EXPAND — noted in info
 * - #OUTPUT_SHIFT / #INPUT_SHIFT — noted in info
 */
export function preprocess(source: string, externalDefines?: string[]): PreprocessResult {
  const lines = source.split("\n");
  const output: string[] = [];
  const helpLines: string[] = [];
  const info: string[] = [];

  // Built-in defines that are always true in the playground
  const defines = new Set<string>([
    "_SIMPL_WINDOWS",
    "_FIRMWARE_HAS_HTTP",
    "_FIRMWARE_HAS_EMAIL",
    ...(externalDefines ?? []),
  ]);

  // Parse #DEFINE_CONSTANT to add to defines set
  for (const line of lines) {
    const match = line.match(/^\s*#DEFINE_CONSTANT\s+(\w+)/i);
    if (match) defines.add(match[1]);
  }

  let inHelp = false;
  const ifStack: boolean[] = []; // true = include this block

  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();

    // Help block
    if (trimmed === "#HELP_BEGIN") {
      inHelp = true;
      output.push(""); // keep line numbers aligned
      continue;
    }
    if (trimmed === "#HELP_END") {
      inHelp = false;
      output.push("");
      continue;
    }
    if (inHelp) {
      helpLines.push(line);
      output.push("");
      continue;
    }

    // Conditional compilation
    const ifDefMatch = line.match(/^\s*#IF_DEFINED\s*\(?\s*(\w+)\s*\)?\s*$/i);
    if (ifDefMatch) {
      ifStack.push(defines.has(ifDefMatch[1]));
      output.push("");
      continue;
    }

    const ifNotDefMatch = line.match(/^\s*#IF_NOT_DEFINED\s*\(?\s*(\w+)\s*\)?\s*$/i);
    if (ifNotDefMatch) {
      ifStack.push(!defines.has(ifNotDefMatch[1]));
      output.push("");
      continue;
    }

    if (trimmed === "#ENDIF") {
      ifStack.pop();
      output.push("");
      continue;
    }

    // Check if we're in an excluded block
    if (ifStack.length > 0 && !ifStack[ifStack.length - 1]) {
      output.push(""); // excluded line — keep blank to maintain line numbers
      continue;
    }

    // Info-only directives
    const printToTrace = line.match(/^\s*#PRINT_TO_TRACE\s*$/i);
    if (printToTrace) {
      info.push("Print output redirected to trace");
      output.push(line);
      continue;
    }

    const digitalExpand = line.match(/^\s*#DIGITAL_EXPAND\s+(\w+)\s*$/i);
    if (digitalExpand) {
      info.push(`Digital expand: ${digitalExpand[1]}`);
      output.push(line);
      continue;
    }

    const analogSerialExpand = line.match(/^\s*#ANALOG_SERIAL_EXPAND\s+(\w+)\s*$/i);
    if (analogSerialExpand) {
      info.push(`Analog/Serial expand: ${analogSerialExpand[1]}`);
      output.push(line);
      continue;
    }

    const outputShift = line.match(/^\s*#OUTPUT_SHIFT\s+(\d+)\s*$/i);
    if (outputShift) {
      info.push(`Output shift: ${outputShift[1]}`);
      output.push(line);
      continue;
    }

    const inputShift = line.match(/^\s*#INPUT_SHIFT\s+(\d+)\s*$/i);
    if (inputShift) {
      info.push(`Input shift: ${inputShift[1]}`);
      output.push(line);
      continue;
    }

    output.push(line);
  }

  return {
    source: output.join("\n"),
    helpText: helpLines.join("\n"),
    defines,
    info,
  };
}
