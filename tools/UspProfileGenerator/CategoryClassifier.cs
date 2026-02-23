using System.Text.RegularExpressions;

namespace UspProfileGenerator;

/// <summary>
/// Classifies a parsed SIMPL+ module into a device category
/// based on filename patterns and I/O signal names.
/// </summary>
public static class CategoryClassifier
{
    private static readonly (string Category, Regex Pattern)[] FileNameRules =
    {
        ("audio", new Regex(@"(?:AVR|receiver|audio|volume|amplif|denon|marantz|yamaha|onkyo|integra|anthem|arcam|nad|rotel|pioneer|harman|jbl|crown|bose|sonance|episode)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("display", new Regex(@"(?:\bTV\b|display|bravia|webos|samsung.*tv|lg.*tv|sony.*tv|vizio|sharp.*tv|panasonic.*tv|hisense|monitor)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("projector", new Regex(@"(?:projector|proiettore|epson.*proj|optoma|benq.*proj|nec.*proj|panasonic.*proj|pjlink|christie|barco|vivitek|infocus)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("matrix", new Regex(@"(?:matrix|switcher|routing|router|wyrestorm|lightware|autopatch|extron.*sw|crestron.*dm|atlona|av\s*pro|kramer|gefen|blustream)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("dsp", new Regex(@"(?:\bBSS\b|biamp|soundweb|mixer|DSP|QSC|dbx|symetrix|ashly|xilica|tesira|nexia|audia)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("lighting", new Regex(@"(?:light|dimmer|scene|lutron|vimar|dali|dynalite|cbus|pharos|helvar|eldoled|dmx.*light|led.*control)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("shades", new Regex(@"(?:shade|blind|tapparel|somfy|sivoia|rollease|nice|screen|curtain|tenda|motoriz|qmotion|hunter.*douglas)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("hvac", new Regex(@"(?:temp|HVAC|fancoil|clima|thermostat|setpoint|chiller|boiler|AHU|heat.*pump|daikin|mitsubishi.*elec|trane|carrier|lennox|nest.*therm|ecobee)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("security", new Regex(@"(?:security|alarm|arm|DSC|elk|KYO|honeywell.*sec|paradox|texecom|risco|inim|bentel|vanderbilt|intruder|burglar)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("media", new Regex(@"(?:play|pause|spotify|apple.*tv|kaleidescape|sonos|roku|bluray|blu.ray|dvd|media.*player|streamer|chromecast|firestick|tivo|directv|satellite)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("gateway", new Regex(@"(?:KNX|EIB|gateway|shelly|smart.*home|z.wave|zigbee|insteon|x10|control4|savant|elan|urc|home.*auto)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("protocol", new Regex(@"(?:modbus|serial_buffer|\bTCP\b|\bUDP\b|protocol|socket|http_client|telnet|ssh|mqtt|api_client)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        ("utility", new Regex(@"(?:timer|clock|converter|CRC|utility|ramp|scheduler|queue|math|string.*util|helper|tool|generic|common|base_mod)", RegexOptions.IgnoreCase | RegexOptions.Compiled)),
    };

    private static readonly (string Category, string[] SignalPatterns)[] IoRules =
    {
        ("audio", new[] { "volume", "mute", "bass", "treble", "balance", "surround", "zone" }),
        ("display", new[] { "power_on", "power_off", "input_hdmi", "input_component", "backlight" }),
        ("projector", new[] { "lamp", "lens", "freeze", "blank", "shutter" }),
        ("matrix", new[] { "route", "switch", "tie", "input_to_output", "video_mute" }),
        ("dsp", new[] { "fader", "level_ch", "mute_ch", "gain", "eq", "crosspoint" }),
        ("lighting", new[] { "dim", "scene", "level", "color_temp", "rgb", "brightness" }),
        ("shades", new[] { "open", "close", "stop", "position", "preset", "raise", "lower" }),
        ("hvac", new[] { "setpoint", "temperature", "fan_speed", "mode_heat", "mode_cool", "mode_auto" }),
        ("security", new[] { "arm_away", "arm_stay", "disarm", "zone_", "partition", "panic" }),
        ("media", new[] { "play", "pause", "stop", "next", "previous", "track", "artist", "album" }),
        ("gateway", new[] { "group_write", "group_read", "object_value", "datapoint" }),
    };

    /// <summary>
    /// Classify a module into a device category.
    /// Returns category string (e.g., "audio", "display", "matrix").
    /// </summary>
    public static string Classify(ParsedModule module)
    {
        // 1. Try filename-based classification first (strongest signal)
        foreach (var (category, pattern) in FileNameRules)
        {
            if (pattern.IsMatch(module.FileName) || pattern.IsMatch(module.BaseName))
                return category;
        }

        // 2. Try I/O signal-based classification
        var allSignals = new List<string>();
        allSignals.AddRange(module.DigitalInputs);
        allSignals.AddRange(module.AnalogInputs);
        allSignals.AddRange(module.StringInputs);
        allSignals.AddRange(module.DigitalOutputs);
        allSignals.AddRange(module.AnalogOutputs);
        allSignals.AddRange(module.StringOutputs);

        var signalText = string.Join(" ", allSignals).ToLowerInvariant();

        var bestCategory = "utility";
        var bestScore = 0;

        foreach (var (category, patterns) in IoRules)
        {
            var score = 0;
            foreach (var pattern in patterns)
            {
                if (signalText.Contains(pattern))
                    score++;
            }
            if (score > bestScore)
            {
                bestScore = score;
                bestCategory = category;
            }
        }

        return bestScore > 0 ? bestCategory : "utility";
    }

    /// <summary>
    /// Extract manufacturer from filename.
    /// Tries to identify known manufacturer names.
    /// </summary>
    public static string ExtractManufacturer(string fileName)
    {
        var manufacturers = new[]
        {
            "Denon", "Marantz", "Yamaha", "Onkyo", "Integra", "Anthem", "Arcam", "NAD", "Rotel",
            "Samsung", "LG", "Sony", "Vizio", "Sharp", "Panasonic", "Hisense",
            "Epson", "Optoma", "BenQ", "NEC", "Christie", "Barco",
            "Wyrestorm", "Lightware", "Extron", "Atlona", "Kramer", "Gefen",
            "BSS", "Biamp", "QSC", "Symetrix",
            "Lutron", "VIMAR", "Dynalite",
            "Somfy", "Sivoia", "Nice",
            "Daikin", "Mitsubishi", "Trane", "Carrier",
            "DSC", "Elk", "Honeywell", "Paradox", "Texecom",
            "Sonos", "Kaleidescape", "Roku", "Apple",
            "Shelly", "KNX",
            "Pioneer", "Harman", "JBL", "Crown", "Bose"
        };

        foreach (var mfg in manufacturers)
        {
            if (fileName.IndexOf(mfg, StringComparison.OrdinalIgnoreCase) >= 0)
                return mfg;
        }

        // Try extracting first word as manufacturer
        var parts = fileName.Split(new[] { ' ', '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 0 ? parts[0] : "Unknown";
    }

    /// <summary>
    /// Extract model from filename (everything after manufacturer).
    /// </summary>
    public static string ExtractModel(string fileName, string manufacturer)
    {
        if (string.IsNullOrEmpty(manufacturer) || manufacturer == "Unknown")
        {
            // Use filename without extension as model
            return CleanModelName(fileName);
        }

        var idx = fileName.IndexOf(manufacturer, StringComparison.OrdinalIgnoreCase);
        if (idx >= 0)
        {
            var afterMfg = fileName.Substring(idx + manufacturer.Length).Trim(' ', '_', '-');
            return CleanModelName(afterMfg);
        }

        return CleanModelName(fileName);
    }

    private static string CleanModelName(string name)
    {
        // Remove version suffixes, file extensions, common prefixes
        name = Regex.Replace(name, @"[_\s]v?\d+\.\d+.*$", "", RegexOptions.IgnoreCase);
        name = Regex.Replace(name, @"\.(usp|csp)$", "", RegexOptions.IgnoreCase);
        name = Regex.Replace(name, @"^(AA_|BB_|CC_)", "", RegexOptions.IgnoreCase);
        name = name.Replace('_', ' ').Trim();
        return string.IsNullOrWhiteSpace(name) ? "Generic" : name;
    }
}
