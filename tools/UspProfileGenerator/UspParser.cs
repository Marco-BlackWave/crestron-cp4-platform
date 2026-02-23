using System.Text.RegularExpressions;

namespace UspProfileGenerator;

/// <summary>
/// Parses SIMPL+ (.usp) source files via regex to extract:
/// I/O declarations, commands, constants, parameters, protocol settings.
///
/// Key improvement: Extracts commands from PUSH event blocks by associating
/// the triggering DIGITAL_INPUT name with makestring() calls inside the block.
/// Also detects #USER_SIMPLSHARP_LIBRARY (C# delegation pattern).
/// </summary>
public sealed class UspParser
{
    // I/O declarations
    private static readonly Regex DigitalInputRx = new(@"DIGITAL_INPUT\s+(.+?)\s*;", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex AnalogInputRx = new(@"ANALOG_INPUT\s+(.+?)\s*;", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex StringInputRx = new(@"STRING_INPUT\s+(.+?)\s*;", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex BufferInputRx = new(@"BUFFER_INPUT\s+(.+?)\s*;", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex DigitalOutputRx = new(@"DIGITAL_OUTPUT\s+(.+?)\s*;", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex AnalogOutputRx = new(@"ANALOG_OUTPUT\s+(.+?)\s*;", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex StringOutputRx = new(@"STRING_OUTPUT\s+(.+?)\s*;", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Constants and parameters
    private static readonly Regex DefineConstantRx = new(@"#DEFINE_CONSTANT\s+(\w+)\s+(.+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex IntParamRx = new(@"INTEGER_PARAMETER\s+(.+?)\s*;", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex StringParamRx = new(@"STRING_PARAMETER\s+(.+?)\s*;", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Command extraction from code
    private static readonly Regex MakeStringRx = new(@"makestring\s*\(\s*(\w[\w$]*)\s*,\s*""([^""]*)""\s*\)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex MakeStringVarRx = new(@"makestring\s*\(\s*(\w[\w$]*)\s*,\s*""([^""]*)""\s*,", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex DirectAssignRx = new(@"(\w[\w$]*)\s*=\s*""([^""]+)""", RegexOptions.Compiled);
    private static readonly Regex FindPatternRx = new(@"find\s*\(\s*""([^""]*)""\s*,\s*(\w[\w$]*)\s*\)", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // PUSH block extraction: captures "PUSH signal_name { ... }" including nested braces
    private static readonly Regex PushBlockRx = new(@"(?:THREADSAFE\s+)?PUSH\s+(\w[\w$]*)\s*\{", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Protocol detection
    private static readonly Regex BaudRateRx = new(@"(?:baud|baudrate|baud_rate)\s*[=:]\s*(\d+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex TcpClientRx = new(@"TCP_CLIENT\s+(\w+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex UdpSocketRx = new(@"UDP_SOCKET\s+(\w+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex PortRx = new(@"(?:port|tcp_port|ip_port)\s*[=:]\s*(\d+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // C# library detection
    private static readonly Regex CsharpLibRx = new(@"#USER_SIMPLSHARP_LIBRARY\s+""([^""]+)""", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public ParsedModule Parse(string filePath)
    {
        var content = File.ReadAllText(filePath);
        var fileName = Path.GetFileNameWithoutExtension(filePath);

        var result = new ParsedModule
        {
            FileName = Path.GetFileName(filePath),
            BaseName = fileName
        };

        // Extract I/O declarations
        ExtractSignals(content, DigitalInputRx, result.DigitalInputs);
        ExtractSignals(content, AnalogInputRx, result.AnalogInputs);
        ExtractSignals(content, StringInputRx, result.StringInputs);
        ExtractSignals(content, BufferInputRx, result.BufferInputs);
        ExtractSignals(content, DigitalOutputRx, result.DigitalOutputs);
        ExtractSignals(content, AnalogOutputRx, result.AnalogOutputs);
        ExtractSignals(content, StringOutputRx, result.StringOutputs);

        // Extract constants
        foreach (Match m in DefineConstantRx.Matches(content))
            result.Constants[m.Groups[1].Value] = m.Groups[2].Value.Trim();

        // Extract parameters
        ExtractSignals(content, IntParamRx, result.IntParameters);
        ExtractSignals(content, StringParamRx, result.StringParameters);

        // Detect C# library usage
        var csharpMatch = CsharpLibRx.Match(content);
        if (csharpMatch.Success)
        {
            result.UsesExternalLibrary = true;
            result.ExternalLibraryName = csharpMatch.Groups[1].Value;
        }

        // Build set of STRING_OUTPUT names for identifying TX outputs
        var stringOutputNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var so in result.StringOutputs) stringOutputNames.Add(so);

        // PHASE 1: Extract commands from PUSH blocks (input → command mapping)
        ExtractPushBlockCommands(content, result, stringOutputNames);

        // PHASE 2: Extract any remaining makestring calls not in PUSH blocks
        // (keyed by the output variable name, as fallback)
        ExtractGlobalMakestrings(content, result, stringOutputNames);

        // Extract find patterns (feedback parsing)
        foreach (Match m in FindPatternRx.Matches(content))
        {
            var pattern = m.Groups[1].Value;
            var bufferName = m.Groups[2].Value;
            if (!result.FeedbackPatterns.ContainsKey(bufferName))
                result.FeedbackPatterns[bufferName] = new List<string>();
            result.FeedbackPatterns[bufferName].Add(pattern);
        }

        // Detect transport type
        if (TcpClientRx.IsMatch(content))
            result.TransportType = "tcp";
        else if (UdpSocketRx.IsMatch(content))
            result.TransportType = "udp";
        else if (BufferInputRx.IsMatch(content) || BaudRateRx.IsMatch(content))
            result.TransportType = "serial";
        else
            result.TransportType = "ir";

        // Extract baud rate
        var baudMatch = BaudRateRx.Match(content);
        if (baudMatch.Success && int.TryParse(baudMatch.Groups[1].Value, out var baud))
            result.BaudRate = baud;

        // Extract port number
        var portMatch = PortRx.Match(content);
        if (portMatch.Success && int.TryParse(portMatch.Groups[1].Value, out var port))
            result.Port = port;

        return result;
    }

    /// <summary>
    /// Extract commands from PUSH blocks by associating the triggering signal name
    /// with makestring/direct-assignment calls within the block body.
    /// E.g., PUSH Power_On { makestring(TX$, "PWON\r"); } → Commands["Power_On"] = ["PWON\r"]
    /// </summary>
    private void ExtractPushBlockCommands(string content, ParsedModule result, HashSet<string> stringOutputNames)
    {
        foreach (Match pushMatch in PushBlockRx.Matches(content))
        {
            var inputName = pushMatch.Groups[1].Value;
            var blockStart = pushMatch.Index + pushMatch.Length;
            var blockBody = ExtractBraceBlock(content, blockStart);
            if (string.IsNullOrEmpty(blockBody)) continue;

            // Find all makestring calls in this PUSH block
            var commands = new List<string>();

            foreach (Match ms in MakeStringRx.Matches(blockBody))
            {
                var target = ms.Groups[1].Value;
                var cmdStr = ms.Groups[2].Value;
                // Only capture if target is a STRING_OUTPUT (TX line)
                if (stringOutputNames.Contains(target) || IsLikelyTxOutput(target))
                    commands.Add(cmdStr);
            }

            foreach (Match ms in MakeStringVarRx.Matches(blockBody))
            {
                var target = ms.Groups[1].Value;
                var cmdStr = ms.Groups[2].Value;
                if (stringOutputNames.Contains(target) || IsLikelyTxOutput(target))
                    commands.Add(cmdStr);
            }

            // Also catch direct string assignments: TX$ = "command"
            foreach (Match da in DirectAssignRx.Matches(blockBody))
            {
                var target = da.Groups[1].Value;
                var cmdStr = da.Groups[2].Value;
                if (stringOutputNames.Contains(target) || IsLikelyTxOutput(target))
                {
                    if (!commands.Contains(cmdStr))
                        commands.Add(cmdStr);
                }
            }

            // Store commands keyed by the input signal name
            if (commands.Count > 0)
            {
                if (!result.Commands.ContainsKey(inputName))
                    result.Commands[inputName] = new List<string>();
                result.Commands[inputName].AddRange(commands);
            }
        }
    }

    /// <summary>
    /// Fallback: extract makestring calls not captured by PUSH block analysis.
    /// These might be in CHANGE handlers, Function blocks, etc.
    /// </summary>
    private void ExtractGlobalMakestrings(string content, ParsedModule result, HashSet<string> stringOutputNames)
    {
        foreach (Match m in MakeStringRx.Matches(content))
        {
            var outputName = m.Groups[1].Value;
            var commandStr = m.Groups[2].Value;

            // Skip if this output name already has commands from PUSH block extraction
            // (to avoid duplicates). Only add if keyed by the output name and it's new.
            if (stringOutputNames.Contains(outputName) || IsLikelyTxOutput(outputName))
            {
                // Store under a generic key using the output name
                var key = "_tx_" + outputName;
                if (!result.Commands.ContainsKey(key))
                    result.Commands[key] = new List<string>();
                if (!result.Commands[key].Contains(commandStr))
                    result.Commands[key].Add(commandStr);
            }
        }

        foreach (Match m in MakeStringVarRx.Matches(content))
        {
            var outputName = m.Groups[1].Value;
            var commandTemplate = m.Groups[2].Value;

            if (stringOutputNames.Contains(outputName) || IsLikelyTxOutput(outputName))
            {
                var key = "_tx_" + outputName;
                if (!result.Commands.ContainsKey(key))
                    result.Commands[key] = new List<string>();
                if (!result.Commands[key].Contains(commandTemplate))
                    result.Commands[key].Add(commandTemplate);
            }
        }
    }

    /// <summary>
    /// Check if a variable name looks like a TX output (common naming patterns).
    /// </summary>
    private static bool IsLikelyTxOutput(string name)
    {
        if (string.IsNullOrEmpty(name)) return false;
        var lower = name.ToLowerInvariant().Replace("$", "");
        return lower.Contains("tx") || lower.Contains("to_device") || lower.Contains("todevice") ||
               lower.Contains("direct_command") || lower.Contains("directcommand") ||
               lower.Contains("serial_tx") || lower.Contains("opentx") ||
               lower.Contains("cmd_out") || lower.Contains("cmdout") ||
               lower.Contains("command_out") || lower.Contains("send");
    }

    /// <summary>
    /// Extract the body of a brace-delimited block starting at the given position.
    /// Handles nested braces. Returns the content between the outer braces.
    /// </summary>
    private static string ExtractBraceBlock(string content, int startAfterOpenBrace)
    {
        var depth = 1;
        var i = startAfterOpenBrace;
        var inString = false;

        while (i < content.Length && depth > 0)
        {
            var c = content[i];

            if (c == '"' && (i == 0 || content[i - 1] != '\\'))
            {
                inString = !inString;
            }
            else if (!inString)
            {
                if (c == '{') depth++;
                else if (c == '}') depth--;
            }

            i++;
        }

        if (depth != 0) return "";

        var blockEnd = i - 1; // position of closing brace
        var blockLength = blockEnd - startAfterOpenBrace;
        return blockLength > 0 ? content.Substring(startAfterOpenBrace, blockLength) : "";
    }

    private static void ExtractSignals(string content, Regex rx, List<string> target)
    {
        foreach (Match m in rx.Matches(content))
        {
            var signalList = m.Groups[1].Value;
            foreach (var sig in signalList.Split(','))
            {
                var name = sig.Trim();
                var bracketIdx = name.IndexOf('[');
                if (bracketIdx >= 0) name = name.Substring(0, bracketIdx).Trim();
                if (!string.IsNullOrWhiteSpace(name) && name != "_skip_")
                    target.Add(name);
            }
        }
    }
}

public sealed class ParsedModule
{
    public string FileName { get; set; } = "";
    public string BaseName { get; set; } = "";
    public string TransportType { get; set; } = "ir";
    public int BaudRate { get; set; }
    public int Port { get; set; }
    public bool UsesExternalLibrary { get; set; }
    public string ExternalLibraryName { get; set; } = "";

    public List<string> DigitalInputs { get; } = new();
    public List<string> AnalogInputs { get; } = new();
    public List<string> StringInputs { get; } = new();
    public List<string> BufferInputs { get; } = new();
    public List<string> DigitalOutputs { get; } = new();
    public List<string> AnalogOutputs { get; } = new();
    public List<string> StringOutputs { get; } = new();
    public List<string> IntParameters { get; } = new();
    public List<string> StringParameters { get; } = new();

    public Dictionary<string, string> Constants { get; } = new(StringComparer.OrdinalIgnoreCase);
    /// <summary>
    /// Commands keyed by triggering input signal name (from PUSH blocks) or _tx_OutputName (fallback).
    /// Each key maps to a list of command strings found.
    /// </summary>
    public Dictionary<string, List<string>> Commands { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, List<string>> FeedbackPatterns { get; } = new(StringComparer.OrdinalIgnoreCase);

    public int TotalInputs => DigitalInputs.Count + AnalogInputs.Count + StringInputs.Count + BufferInputs.Count;
    public int TotalOutputs => DigitalOutputs.Count + AnalogOutputs.Count + StringOutputs.Count;
}
