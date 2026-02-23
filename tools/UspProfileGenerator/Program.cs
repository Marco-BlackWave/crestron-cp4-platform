using System.Text.Json;
using System.Text.Json.Serialization;

namespace UspProfileGenerator;

/// <summary>
/// CLI entry point for the USP Profile Generator.
/// Reads SIMPL+ .usp files and generates JSON device profiles.
///
/// Usage:
///   dotnet run -- --input <dir> --output <dir> [--catalog]
///
/// Options:
///   --input   Directory containing .usp files (recursive)
///   --output  Output directory for generated profiles (default: ../../devices)
///   --catalog Generate catalog.json index file
///   --verbose Show detailed parsing output
/// </summary>
class Program
{
    static int Main(string[] args)
    {
        string? inputDir = null;
        string? outputDir = null;
        var generateCatalog = false;
        var verbose = false;

        // Parse arguments
        for (int i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--input" when i + 1 < args.Length:
                    inputDir = args[++i];
                    break;
                case "--output" when i + 1 < args.Length:
                    outputDir = args[++i];
                    break;
                case "--catalog":
                    generateCatalog = true;
                    break;
                case "--verbose":
                    verbose = true;
                    break;
                case "--help":
                    PrintUsage();
                    return 0;
            }
        }

        if (string.IsNullOrEmpty(inputDir))
        {
            Console.Error.WriteLine("Error: --input directory is required.");
            PrintUsage();
            return 1;
        }

        if (!Directory.Exists(inputDir))
        {
            Console.Error.WriteLine("Error: input directory not found: " + inputDir);
            return 1;
        }

        outputDir ??= Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "devices");
        Directory.CreateDirectory(outputDir);

        Console.WriteLine("=== USP Profile Generator ===");
        Console.WriteLine("Input:  " + Path.GetFullPath(inputDir));
        Console.WriteLine("Output: " + Path.GetFullPath(outputDir));
        Console.WriteLine();

        // 1. Find all .usp files
        var allFiles = Directory.GetFiles(inputDir, "*.usp", SearchOption.AllDirectories);
        Console.WriteLine("Found " + allFiles.Length + " .usp files");

        // 2. Deduplicate (keep best version of each module)
        var bestVersions = Deduplicator.SelectBestVersions(allFiles);
        var (total, unique, removed) = Deduplicator.GetStats(allFiles, bestVersions);
        Console.WriteLine("After deduplication: " + unique + " unique modules (" + removed + " duplicates removed)");
        Console.WriteLine();

        // 3. Parse and generate profiles
        var parser = new UspParser();
        var generator = new ProfileGenerator();
        var profiles = new List<DeviceProfileDto>();
        var errors = new List<string>();
        var categoryCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var filePath in bestVersions)
        {
            try
            {
                var module = parser.Parse(filePath);
                var category = CategoryClassifier.Classify(module);
                var profile = generator.Generate(module, category);

                generator.SaveToFile(profile, outputDir);
                profiles.Add(profile);

                if (!categoryCounts.ContainsKey(category))
                    categoryCounts[category] = 0;
                categoryCounts[category]++;

                if (verbose)
                    Console.WriteLine("  [" + category + "] " + profile.Id + " ← " + module.FileName);
            }
            catch (Exception ex)
            {
                errors.Add(Path.GetFileName(filePath) + ": " + ex.Message);
                if (verbose)
                    Console.Error.WriteLine("  ERROR: " + Path.GetFileName(filePath) + ": " + ex.Message);
            }
        }

        // 4. Print summary
        Console.WriteLine("=== Generation Complete ===");
        Console.WriteLine("Total profiles generated: " + profiles.Count);
        Console.WriteLine();
        Console.WriteLine("By category:");
        foreach (var kvp in categoryCounts.OrderByDescending(x => x.Value))
        {
            Console.WriteLine("  " + kvp.Key.PadRight(15) + kvp.Value);
        }

        if (errors.Count > 0)
        {
            Console.WriteLine();
            Console.WriteLine("Errors: " + errors.Count);
            foreach (var err in errors.Take(20))
                Console.Error.WriteLine("  " + err);
            if (errors.Count > 20)
                Console.Error.WriteLine("  ... and " + (errors.Count - 20) + " more");
        }

        // 5. Generate catalog
        if (generateCatalog)
        {
            GenerateCatalog(outputDir, profiles, categoryCounts);
        }

        return 0;
    }

    static void GenerateCatalog(string outputDir, List<DeviceProfileDto> profiles,
                                 Dictionary<string, int> categoryCounts)
    {
        Console.WriteLine();
        Console.WriteLine("Generating catalog.json...");

        var catalog = new CatalogDto
        {
            Version = "1.0",
            GeneratedAt = DateTime.UtcNow.ToString("o"),
            TotalProfiles = profiles.Count,
            Categories = new Dictionary<string, CategoryInfoDto>(),
            Profiles = new List<CatalogProfileDto>()
        };

        var profilesByCategory = profiles.GroupBy(p => p.Category).ToDictionary(g => g.Key, g => g.ToList());

        foreach (var kvp in profilesByCategory.OrderBy(x => x.Key))
        {
            catalog.Categories[kvp.Key] = new CategoryInfoDto
            {
                Count = kvp.Value.Count,
                Profiles = kvp.Value.Select(p => p.Id).OrderBy(x => x).ToList()
            };
        }

        foreach (var p in profiles.OrderBy(x => x.Id))
        {
            var protocolList = new List<string>();
            if (p.Protocols?.Ir != null) protocolList.Add("ir");
            if (p.Protocols?.Serial != null) protocolList.Add("serial");
            if (p.Protocols?.Ip != null) protocolList.Add(p.Protocols.Ip.Type ?? "tcp");

            catalog.Profiles.Add(new CatalogProfileDto
            {
                Id = p.Id,
                Manufacturer = p.Manufacturer,
                Model = p.Model,
                Category = p.Category,
                Protocols = protocolList,
                SourceModule = p.SourceModule
            });
        }

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var json = JsonSerializer.Serialize(catalog, options);
        File.WriteAllText(Path.Combine(outputDir, "catalog.json"), json);
        Console.WriteLine("Catalog written: " + Path.Combine(outputDir, "catalog.json"));
    }

    static void PrintUsage()
    {
        Console.WriteLine("Usage: UspProfileGenerator --input <dir> --output <dir> [--catalog] [--verbose]");
        Console.WriteLine();
        Console.WriteLine("Options:");
        Console.WriteLine("  --input <dir>    Directory containing .usp files (searched recursively)");
        Console.WriteLine("  --output <dir>   Output directory for generated profiles (default: ../../devices)");
        Console.WriteLine("  --catalog        Generate catalog.json index file");
        Console.WriteLine("  --verbose        Show detailed output for each file");
    }
}

// Catalog DTOs

public sealed class CatalogDto
{
    public string Version { get; set; } = "";
    public string GeneratedAt { get; set; } = "";
    public int TotalProfiles { get; set; }
    public Dictionary<string, CategoryInfoDto> Categories { get; set; } = new();
    public List<CatalogProfileDto> Profiles { get; set; } = new();
}

public sealed class CategoryInfoDto
{
    public int Count { get; set; }
    public List<string> Profiles { get; set; } = new();
}

public sealed class CatalogProfileDto
{
    public string Id { get; set; } = "";
    public string Manufacturer { get; set; } = "";
    public string Model { get; set; } = "";
    public string Category { get; set; } = "";
    public List<string> Protocols { get; set; } = new();
    public string? SourceModule { get; set; }
}
