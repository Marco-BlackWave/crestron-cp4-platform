using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace UspProfileGenerator;

/// <summary>
/// Converts parsed SIMPL+ module data into JSON device profiles
/// compatible with the ProcessorSide DeviceProfileLoader.
/// </summary>
public sealed class ProfileGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Generate a device profile JSON from a parsed module.
    /// </summary>
    public DeviceProfileDto Generate(ParsedModule module, string category)
    {
        var manufacturer = CategoryClassifier.ExtractManufacturer(module.BaseName);
        var model = CategoryClassifier.ExtractModel(module.BaseName, manufacturer);
        var id = GenerateId(manufacturer, model);

        var profile = new DeviceProfileDto
        {
            Id = id,
            Manufacturer = manufacturer,
            Model = model,
            Category = category,
            SourceModule = module.FileName,
            ExternalLibrary = module.UsesExternalLibrary ? module.ExternalLibraryName : null,
            Protocols = BuildProtocols(module),
            Capabilities = BuildCapabilities(module),
        };

        // Add category-specific sections
        switch (category)
        {
            case "matrix":
                profile.Matrix = BuildMatrixConfig(module);
                break;
            case "dsp":
                profile.Dsp = BuildDspConfig(module);
                break;
            case "media":
                profile.Media = BuildMediaConfig(module);
                break;
            case "gateway":
                profile.Gateway = BuildGatewayConfig(module);
                break;
        }

        // Add feedback rules if any patterns found
        var feedbackRules = BuildFeedbackRules(module);
        if (feedbackRules.Count > 0)
            profile.FeedbackRules = feedbackRules;

        return profile;
    }

    /// <summary>
    /// Serialize a profile to JSON string.
    /// </summary>
    public string ToJson(DeviceProfileDto profile)
    {
        return JsonSerializer.Serialize(profile, JsonOptions);
    }

    /// <summary>
    /// Save profile to a JSON file.
    /// </summary>
    public void SaveToFile(DeviceProfileDto profile, string outputDir)
    {
        var categoryDir = Path.Combine(outputDir, MapCategoryToDir(profile.Category));
        Directory.CreateDirectory(categoryDir);

        var filePath = Path.Combine(categoryDir, profile.Id + ".json");
        var json = ToJson(profile);
        File.WriteAllText(filePath, json);
    }

    private static string GenerateId(string manufacturer, string model)
    {
        var raw = manufacturer + " " + model;
        // Convert to kebab-case: "Denon AVR-3313CI" → "denon-avr-3313ci"
        raw = raw.ToLowerInvariant();
        raw = Regex.Replace(raw, @"[^a-z0-9]+", "-");
        raw = raw.Trim('-');
        return raw;
    }

    private static ProtocolSetDto BuildProtocols(ParsedModule module)
    {
        var protocols = new ProtocolSetDto();
        var commands = ExtractCommandStrings(module);

        switch (module.TransportType)
        {
            case "serial":
                protocols.Serial = new SerialProtocolDto
                {
                    BaudRate = module.BaudRate > 0 ? module.BaudRate : 9600,
                    DataBits = 8,
                    Parity = "none",
                    StopBits = 1,
                    Commands = commands.Count > 0 ? commands : null
                };
                break;
            case "tcp":
            case "udp":
                protocols.Ip = new IpProtocolDto
                {
                    Port = module.Port > 0 ? module.Port : 23,
                    Type = module.TransportType,
                    Commands = commands.Count > 0 ? commands : null
                };
                break;
            case "ir":
            default:
                protocols.Ir = new IrProtocolDto
                {
                    Commands = commands.Count > 0 ? commands : null
                };
                break;
        }

        return protocols;
    }

    private static Dictionary<string, string> ExtractCommandStrings(ParsedModule module)
    {
        var commands = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var kvp in module.Commands)
        {
            var signalName = kvp.Key;
            var commandStrings = kvp.Value;
            if (commandStrings.Count == 0) continue;

            // Skip _tx_ prefixed keys (fallback global makestrings) if we have
            // PUSH-block commands — those are better keyed
            if (signalName.StartsWith("_tx_", StringComparison.OrdinalIgnoreCase))
            {
                // Add these commands with sequential naming as fallback
                for (int i = 0; i < commandStrings.Count; i++)
                {
                    var cmd = UnescapeSimplString(commandStrings[i]);
                    if (string.IsNullOrWhiteSpace(cmd) || cmd == "%s") continue;
                    var fallbackKey = "cmd" + (commands.Count + 1);
                    if (!commands.ContainsValue(cmd)) // avoid duplicate values
                        commands[fallbackKey] = cmd;
                }
                continue;
            }

            // Use the first non-trivial command string found for this input signal
            string bestCmd = null;
            foreach (var cs in commandStrings)
            {
                var unescaped = UnescapeSimplString(cs);
                // Skip trivial format strings that are just placeholders
                if (unescaped == "%s" || unescaped == "%d" || string.IsNullOrWhiteSpace(unescaped))
                    continue;
                bestCmd = unescaped;
                break;
            }

            if (bestCmd == null) continue;

            // Map signal name to a normalized command key
            var key = NormalizeCommandKey(signalName);
            if (!string.IsNullOrEmpty(key) && !commands.ContainsKey(key))
                commands[key] = bestCmd;
        }

        return commands;
    }

    private static string NormalizeCommandKey(string signalName)
    {
        if (string.IsNullOrEmpty(signalName)) return "";

        // Common SIMPL+ signal name patterns → camelCase command keys
        var name = signalName.Trim()
            .Replace("$", "")
            .Replace("*", "");

        // Convert to camelCase
        var parts = name.Split(new[] { '_', ' ', '-' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return "";

        var result = parts[0].ToLowerInvariant();
        for (int i = 1; i < parts.Length; i++)
        {
            if (parts[i].Length > 0)
                result += char.ToUpperInvariant(parts[i][0]) + parts[i].Substring(1).ToLowerInvariant();
        }

        return result;
    }

    private static string UnescapeSimplString(string s)
    {
        // Convert SIMPL+ escape sequences to actual characters
        return s.Replace("\\x0D", "\r")
                .Replace("\\x0A", "\n")
                .Replace("\\r", "\r")
                .Replace("\\n", "\n")
                .Replace("\\\"", "\"");
    }

    private static CapabilitiesDto BuildCapabilities(ParsedModule module)
    {
        var allInputNames = string.Join(" ", module.DigitalInputs).ToLowerInvariant();
        var allOutputNames = string.Join(" ", module.DigitalOutputs).ToLowerInvariant();

        return new CapabilitiesDto
        {
            DiscretePower = allInputNames.Contains("power_on") || allInputNames.Contains("poweron"),
            VolumeControl = allInputNames.Contains("volume") || allInputNames.Contains("vol"),
            InputSelect = allInputNames.Contains("input") || allInputNames.Contains("source"),
            Feedback = module.BufferInputs.Count > 0 || module.FeedbackPatterns.Count > 0,
        };
    }

    private static MatrixConfigDto? BuildMatrixConfig(ParsedModule module)
    {
        // Try to detect matrix size from signal names
        var maxInput = 0;
        var maxOutput = 0;

        foreach (var name in module.DigitalInputs.Concat(module.AnalogInputs))
        {
            var m = Regex.Match(name, @"(?:input|in|src)[\s_]*(\d+)", RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups[1].Value, out var n))
                maxInput = Math.Max(maxInput, n);

            m = Regex.Match(name, @"(?:output|out|dst)[\s_]*(\d+)", RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups[1].Value, out var o))
                maxOutput = Math.Max(maxOutput, o);
        }

        return new MatrixConfigDto
        {
            Inputs = maxInput > 0 ? maxInput : 8,
            Outputs = maxOutput > 0 ? maxOutput : 8,
        };
    }

    private static DspConfigDto? BuildDspConfig(ParsedModule module)
    {
        var maxChannel = 0;
        foreach (var name in module.AnalogInputs.Concat(module.AnalogOutputs))
        {
            var m = Regex.Match(name, @"(?:ch|channel|fader)[\s_]*(\d+)", RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups[1].Value, out var n))
                maxChannel = Math.Max(maxChannel, n);
        }

        return new DspConfigDto
        {
            MaxChannels = maxChannel > 0 ? maxChannel : 8,
        };
    }

    private static MediaConfigDto? BuildMediaConfig(ParsedModule module)
    {
        var transportCmds = new Dictionary<string, string>();
        var allInputs = string.Join("|", module.DigitalInputs);

        // Map common media signal names to transport commands
        var mediaSignals = new[] { "play", "pause", "stop", "next", "previous", "ffwd", "rew" };
        foreach (var sig in mediaSignals)
        {
            if (allInputs.IndexOf(sig, StringComparison.OrdinalIgnoreCase) >= 0)
            {
                // Check if we have an actual command for this signal
                foreach (var kvp in module.Commands)
                {
                    if (kvp.Key.IndexOf(sig, StringComparison.OrdinalIgnoreCase) >= 0 && kvp.Value.Count > 0)
                    {
                        transportCmds[sig] = UnescapeSimplString(kvp.Value[0]);
                        break;
                    }
                }
            }
        }

        return transportCmds.Count > 0 ? new MediaConfigDto { TransportCommands = transportCmds } : null;
    }

    private static GatewayConfigDto? BuildGatewayConfig(ParsedModule module)
    {
        // KNX/gateway modules often have object lists in constants
        var objects = new List<GatewayObjectDto>();

        foreach (var kvp in module.Constants)
        {
            if (kvp.Key.Contains("group", StringComparison.OrdinalIgnoreCase) ||
                kvp.Key.Contains("address", StringComparison.OrdinalIgnoreCase))
            {
                objects.Add(new GatewayObjectDto
                {
                    Id = kvp.Value,
                    Name = kvp.Key,
                    Type = "generic"
                });
            }
        }

        return objects.Count > 0 ? new GatewayConfigDto { Objects = objects } : null;
    }

    private static List<FeedbackRuleDto> BuildFeedbackRules(ParsedModule module)
    {
        var rules = new List<FeedbackRuleDto>();

        foreach (var kvp in module.FeedbackPatterns)
        {
            foreach (var pattern in kvp.Value)
            {
                if (string.IsNullOrWhiteSpace(pattern)) continue;

                // Convert SIMPL+ find patterns to regex where possible
                var regexPattern = EscapeToRegex(pattern);
                rules.Add(new FeedbackRuleDto
                {
                    Pattern = regexPattern,
                    Signal = kvp.Key
                });
            }
        }

        return rules;
    }

    private static string EscapeToRegex(string simplPattern)
    {
        // Simple conversion: escape regex special chars, keep as literal match
        return Regex.Escape(simplPattern);
    }

    private static string MapCategoryToDir(string category) => category switch
    {
        "audio" => "audio",
        "display" => "displays",
        "projector" => "projectors",
        "matrix" => "matrices",
        "dsp" => "dsp",
        "lighting" => "lighting",
        "shades" => "shades",
        "hvac" => "hvac",
        "security" => "security",
        "media" => "streaming",
        "gateway" => "smart-home",
        "protocol" => "protocol",
        "utility" => "utility",
        _ => "other"
    };
}

// DTOs for JSON serialization (System.Text.Json)

public sealed class DeviceProfileDto
{
    public string Id { get; set; } = "";
    public string Manufacturer { get; set; } = "";
    public string Model { get; set; } = "";
    public string Category { get; set; } = "";
    public ProtocolSetDto? Protocols { get; set; }
    public CapabilitiesDto? Capabilities { get; set; }
    public MatrixConfigDto? Matrix { get; set; }
    public DspConfigDto? Dsp { get; set; }
    public MediaConfigDto? Media { get; set; }
    public GatewayConfigDto? Gateway { get; set; }
    public List<FeedbackRuleDto>? FeedbackRules { get; set; }
    public string? SourceModule { get; set; }
    public string? ExternalLibrary { get; set; }
}

public sealed class ProtocolSetDto
{
    public IrProtocolDto? Ir { get; set; }
    public SerialProtocolDto? Serial { get; set; }
    public IpProtocolDto? Ip { get; set; }
}

public sealed class IrProtocolDto
{
    public string? DriverFile { get; set; }
    public Dictionary<string, string>? Commands { get; set; }
}

public sealed class SerialProtocolDto
{
    public int BaudRate { get; set; }
    public int DataBits { get; set; }
    public string Parity { get; set; } = "none";
    public int StopBits { get; set; }
    public Dictionary<string, string>? Commands { get; set; }
}

public sealed class IpProtocolDto
{
    public int Port { get; set; }
    public string Type { get; set; } = "tcp";
    public Dictionary<string, string>? Commands { get; set; }
}

public sealed class CapabilitiesDto
{
    public bool DiscretePower { get; set; }
    public bool VolumeControl { get; set; }
    public bool InputSelect { get; set; }
    public bool Feedback { get; set; }
    public int WarmupMs { get; set; }
    public int CooldownMs { get; set; }
}

public sealed class MatrixConfigDto
{
    public int Inputs { get; set; }
    public int Outputs { get; set; }
    public string? RouteCommandTemplate { get; set; }
    public string? MuteCommandTemplate { get; set; }
    public string? FeedbackPattern { get; set; }
}

public sealed class DspConfigDto
{
    public int MaxChannels { get; set; }
    public string? ObjectIdFormat { get; set; }
    public string? LevelCommandTemplate { get; set; }
    public string? MuteCommandTemplate { get; set; }
    public string? SubscribeCommandTemplate { get; set; }
}

public sealed class MediaConfigDto
{
    public Dictionary<string, string>? TransportCommands { get; set; }
    public NowPlayingFeedbackDto? NowPlayingFeedback { get; set; }
}

public sealed class NowPlayingFeedbackDto
{
    public string? TrackPattern { get; set; }
    public string? ArtistPattern { get; set; }
}

public sealed class GatewayConfigDto
{
    public List<GatewayObjectDto>? Objects { get; set; }
}

public sealed class GatewayObjectDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Type { get; set; } = "generic";
    public string? DataType { get; set; }
}

public sealed class FeedbackRuleDto
{
    public string Pattern { get; set; } = "";
    public string Signal { get; set; } = "";
    public string? Transform { get; set; }
    public object? Value { get; set; }
}
