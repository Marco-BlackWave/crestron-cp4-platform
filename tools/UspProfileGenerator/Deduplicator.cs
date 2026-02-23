using System.Text.RegularExpressions;

namespace UspProfileGenerator;

/// <summary>
/// Groups version variants of the same module and picks the best version.
/// E.g., "Denon AVR-3313 v1.0.usp", "Denon AVR-3313 v1.1.usp" → keep v1.1
/// </summary>
public static class Deduplicator
{
    private static readonly Regex VersionSuffix = new(
        @"[\s_]v?(\d+(?:\.\d+)*)(?:\s*(?:processor|Processor|PROCESSOR))?\.usp$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex TrailingVersion = new(
        @"[\s_]v?\d+(?:\.\d+)*\s*$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Group files by base name (stripping version suffix) and return the best version from each group.
    /// </summary>
    public static List<string> SelectBestVersions(IEnumerable<string> filePaths)
    {
        var groups = new Dictionary<string, List<(string Path, Version Version)>>(StringComparer.OrdinalIgnoreCase);

        foreach (var path in filePaths)
        {
            var fileName = Path.GetFileName(path);
            var baseName = GetBaseName(fileName);
            var version = ExtractVersion(fileName);

            if (!groups.ContainsKey(baseName))
                groups[baseName] = new List<(string, Version)>();

            groups[baseName].Add((path, version));
        }

        var result = new List<string>();
        foreach (var group in groups.Values)
        {
            // Sort by version descending, pick highest
            group.Sort((a, b) => b.Version.CompareTo(a.Version));
            result.Add(group[0].Path);
        }

        return result;
    }

    /// <summary>
    /// Get base name without version suffix.
    /// "Denon AVR-3313CI v1.2 Processor.usp" → "Denon AVR-3313CI"
    /// </summary>
    public static string GetBaseName(string fileName)
    {
        // Remove .usp extension
        var name = Path.GetFileNameWithoutExtension(fileName);

        // Remove " Processor" suffix (common Italian pattern)
        name = Regex.Replace(name, @"\s*(?:Processor|processor|PROCESSOR)\s*$", "");

        // Remove version suffix
        name = TrailingVersion.Replace(name, "");

        return name.Trim();
    }

    /// <summary>
    /// Extract version from filename.
    /// "Denon AVR-3313CI v1.2.usp" → Version(1, 2)
    /// Returns Version(0, 0) if no version found.
    /// </summary>
    public static Version ExtractVersion(string fileName)
    {
        var match = VersionSuffix.Match(fileName);
        if (match.Success)
        {
            var versionStr = match.Groups[1].Value;
            if (Version.TryParse(versionStr.Contains('.') ? versionStr : versionStr + ".0", out var version))
                return version;
        }

        // Try finding version anywhere in filename
        var anyVersion = Regex.Match(fileName, @"v(\d+(?:\.\d+)+)", RegexOptions.IgnoreCase);
        if (anyVersion.Success && Version.TryParse(anyVersion.Groups[1].Value, out var v))
            return v;

        return new Version(0, 0);
    }

    /// <summary>
    /// Get statistics about deduplication.
    /// </summary>
    public static (int totalFiles, int uniqueModules, int duplicatesRemoved) GetStats(
        IEnumerable<string> allFiles, IEnumerable<string> bestVersions)
    {
        var total = allFiles.Count();
        var unique = bestVersions.Count();
        return (total, unique, total - unique);
    }
}
