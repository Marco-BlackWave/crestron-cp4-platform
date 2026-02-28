using System.Collections.Concurrent;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Security;
using System.Xml.Linq;
using Microsoft.AspNetCore.StaticFiles;
using JoinListApi.Services;
using Renci.SshNet;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

var logger = app.Services.GetRequiredService<ILogger<Program>>();
var useRealAppleTv = builder.Configuration.GetValue<bool?>("Media:AppleTv:UseReal") ?? true;
var useRealSonos = builder.Configuration.GetValue<bool?>("Media:Sonos:UseReal") ?? true;

app.Urls.Clear();
app.Urls.Add("http://localhost:5000");

string joinListPathSetting = builder.Configuration["JoinListPath"] ?? string.Empty;
string joinListPath = string.IsNullOrWhiteSpace(joinListPathSetting)
    ? Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "assets", "JoinList.json"))
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, joinListPathSetting));

string systemConfigPathSetting = builder.Configuration["SystemConfigPath"] ?? string.Empty;
string systemConfigPath = string.IsNullOrWhiteSpace(systemConfigPathSetting)
    ? Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "assets", "SystemConfig.json"))
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, systemConfigPathSetting));

string devicesPathSetting = builder.Configuration["DevicesPath"] ?? string.Empty;
string devicesPath = string.IsNullOrWhiteSpace(devicesPathSetting)
    ? Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "devices"))
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, devicesPathSetting));

string projectsPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "assets", "projects"));
Directory.CreateDirectory(projectsPath);

string projectReposPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "assets", "project-repos"));
Directory.CreateDirectory(projectReposPath);

string driversSdkPathSetting = builder.Configuration["DriversSdkPath"] ?? string.Empty;
string driversSdkPath = string.IsNullOrWhiteSpace(driversSdkPathSetting)
    ? @"C:\Users\BlackWave\Downloads\crestron_drivers_sdk_27.0000.0024"
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, driversSdkPathSetting));

string ch5ReleaseNotesPathSetting = builder.Configuration["Ch5ReleaseNotesPath"] ?? string.Empty;
string ch5ReleaseNotesPath = string.IsNullOrWhiteSpace(ch5ReleaseNotesPathSetting)
    ? @"C:\Users\BlackWave\Downloads\ch5_2.17.1_release_notes.pdf"
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, ch5ReleaseNotesPathSetting));

string sdkCdPdfPathSetting = builder.Configuration["SdkCdPdfPath"] ?? string.Empty;
string sdkCdPdfPath = string.IsNullOrWhiteSpace(sdkCdPdfPathSetting)
    ? @"C:\Users\BlackWave\Downloads\ss_SDK-CD.pdf"
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, sdkCdPdfPathSetting));

string xpanelSourceRootSetting = builder.Configuration["XpanelSourceRoot"] ?? string.Empty;
string xpanelSourceRoot = string.IsNullOrWhiteSpace(xpanelSourceRootSetting)
    ? @"C:\Users\BlackWave\Desktop\crestron-home"
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, xpanelSourceRootSetting));

string xpanelPackageRootSetting = builder.Configuration["XpanelPackageRoot"] ?? string.Empty;
string xpanelPackageRoot = string.IsNullOrWhiteSpace(xpanelPackageRootSetting)
    ? Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "assets", "xpanel-package"))
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, xpanelPackageRootSetting));

var fileLock = new SemaphoreSlim(1, 1);
var fileStore = new LockedFileStore(fileLock);

logger.LogInformation("JoinList path: {Path}", joinListPath);
logger.LogInformation("SystemConfig path: {Path}", systemConfigPath);
logger.LogInformation("Devices path: {Path}", devicesPath);
logger.LogInformation("Projects path: {Path}", projectsPath);
logger.LogInformation("Project repos path: {Path}", projectReposPath);
logger.LogInformation("Drivers SDK path: {Path}", driversSdkPath);
logger.LogInformation("CH5 release notes path: {Path}", ch5ReleaseNotesPath);
logger.LogInformation("SDK-CD PDF path: {Path}", sdkCdPdfPath);
logger.LogInformation("XPanel source root: {Path}", xpanelSourceRoot);
logger.LogInformation("XPanel package root: {Path}", xpanelPackageRoot);
logger.LogInformation("Apple TV control mode: {Mode}", useRealAppleTv ? "real" : "mock");
logger.LogInformation("Sonos control mode: {Mode}", useRealSonos ? "real" : "mock");

app.UseExceptionHandler(exApp =>
{
    exApp.Run(async context =>
    {
        logger.LogError("Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = "Internal server error." }));
    });
});

app.UseCors();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/joinlist", async () =>
{
    if (!File.Exists(joinListPath))
    {
        return Results.NotFound(new { message = "Join List file not found." });
    }

    try
    {
        string json = await fileStore.ReadAllTextAsync(joinListPath);
        return Results.Text(json, "application/json");
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to read JoinList file.");
        return Results.Problem("Unable to read Join List file.");
    }
});

app.MapPut("/api/joinlist", async (HttpRequest request) =>
{
    // Enforce 1MB size limit
    if (request.ContentLength > 1_048_576)
    {
        return Results.BadRequest(new { message = "Request body too large. Maximum 1MB." });
    }

    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    if (body.Length > 1_048_576)
    {
        return Results.BadRequest(new { message = "Request body too large. Maximum 1MB." });
    }

    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { message = "Empty payload." });
    }

    if (!TryValidateJoinList(body, out var error))
    {
        return Results.BadRequest(new { message = error });
    }

    try
    {
        var directory = Path.GetDirectoryName(joinListPath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await fileStore.AtomicWriteAsync(joinListPath, body);

        logger.LogInformation("JoinList updated successfully.");
        return Results.Ok(new { message = "Join List updated." });
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to write JoinList file.");
        return Results.Problem("Unable to write Join List file.");
    }
});

// --- SystemConfig endpoint ---
app.MapGet("/api/systemconfig", async () =>
{
    if (!File.Exists(systemConfigPath))
    {
        return Results.NotFound(new { message = "SystemConfig file not found." });
    }

    try
    {
        string json = await fileStore.ReadAllTextAsync(systemConfigPath);
        return Results.Text(json, "application/json");
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to read SystemConfig file.");
        return Results.Problem("Unable to read SystemConfig file.");
    }
});

// --- PUT SystemConfig endpoint ---
app.MapPut("/api/systemconfig", async (HttpRequest request) =>
{
    if (request.ContentLength > 1_048_576)
    {
        return Results.BadRequest(new { message = "Request body too large. Maximum 1MB." });
    }

    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    if (body.Length > 1_048_576)
    {
        return Results.BadRequest(new { message = "Request body too large. Maximum 1MB." });
    }

    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { message = "Empty payload." });
    }

    if (!TryValidateSystemConfig(body, out var error))
    {
        return Results.BadRequest(new { message = error });
    }

    try
    {
        var directory = Path.GetDirectoryName(systemConfigPath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await fileStore.AtomicWriteAsync(systemConfigPath, body);

        logger.LogInformation("SystemConfig updated successfully.");
        return Results.Ok(new { message = "SystemConfig updated." });
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to write SystemConfig file.");
        return Results.Problem("Unable to write SystemConfig file.");
    }
});

// --- Validate SystemConfig endpoint ---
app.MapPost("/api/systemconfig/validate", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { valid = false, errors = new[] { "Empty payload." } });
    }

    if (!TryValidateSystemConfig(body, out var error))
    {
        return Results.Ok(new { valid = false, errors = new[] { error } });
    }

    return Results.Ok(new { valid = true, errors = Array.Empty<string>() });
});

// --- New SystemConfig template endpoint ---
app.MapPost("/api/systemconfig/new", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { message = "Empty payload." });
    }

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var projectId = root.TryGetProperty("projectId", out var pid) ? pid.GetString() ?? "" : "";
        var systemName = root.TryGetProperty("systemName", out var sn) ? sn.GetString() ?? "" : "";

        if (string.IsNullOrWhiteSpace(projectId))
        {
            return Results.BadRequest(new { message = "projectId is required." });
        }

        if (string.IsNullOrWhiteSpace(systemName))
        {
            systemName = projectId;
        }

        var rooms = new List<object>();
        int offset = 0;
        if (root.TryGetProperty("rooms", out var roomsEl) && roomsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var room in roomsEl.EnumerateArray())
            {
                var roomName = room.TryGetProperty("name", out var rn) ? rn.GetString() ?? "Room" : "Room";
                var roomId = Slugify(roomName);
                rooms.Add(new
                {
                    id = roomId,
                    name = roomName,
                    joinOffset = offset,
                    processorId = "main",
                    subsystems = new[] { "av", "lighting" },
                    devices = new Dictionary<string, object>(),
                    sources = Array.Empty<string>(),
                });
                offset += 100;
            }
        }

        var config = new
        {
            schemaVersion = "1.0",
            projectId,
            processor = "CP4",
            system = new
            {
                name = systemName,
                eiscIpId = "0x03",
                eiscIpAddress = "127.0.0.2",
                processors = new[]
                {
                    new { id = "main", processor = "CP4", eiscIpId = "0x03", eiscIpAddress = "127.0.0.2" }
                },
            },
            rooms,
            sources = Array.Empty<object>(),
            scenes = Array.Empty<object>(),
        };

        return Results.Json(config);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

// --- Task/spec scaffold endpoint ---
app.MapPost("/api/systemconfig/scaffold", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { message = "Empty payload." });
    }

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var systemName = root.TryGetProperty("systemName", out var sn) ? (sn.GetString() ?? "") : "";
        var projectId = root.TryGetProperty("projectId", out var pid) ? (pid.GetString() ?? "") : "";

        if (string.IsNullOrWhiteSpace(systemName) && string.IsNullOrWhiteSpace(projectId))
        {
            return Results.BadRequest(new { message = "Provide at least systemName or projectId." });
        }

        if (string.IsNullOrWhiteSpace(systemName))
            systemName = projectId;
        if (string.IsNullOrWhiteSpace(projectId))
            projectId = Slugify(systemName);

        var assumptions = new List<string>();
        var tasks = new List<string>();
        var integrations = new List<string>();

        if (root.TryGetProperty("tasks", out var tasksEl) && tasksEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var taskEl in tasksEl.EnumerateArray())
            {
                var task = (taskEl.GetString() ?? "").Trim();
                if (!string.IsNullOrEmpty(task)) tasks.Add(task);
            }
        }

        if (root.TryGetProperty("integrations", out var integrationsEl) && integrationsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var intEl in integrationsEl.EnumerateArray())
            {
                var integration = (intEl.GetString() ?? "").Trim();
                if (!string.IsNullOrEmpty(integration)) integrations.Add(integration);
            }
        }

        var processors = new List<object>();
        if (root.TryGetProperty("processors", out var processorsEl) && processorsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var procEl in processorsEl.EnumerateArray())
            {
                var id = procEl.TryGetProperty("id", out var pIdEl) ? (pIdEl.GetString() ?? "") : "";
                var procType = procEl.TryGetProperty("processor", out var pTypeEl) ? (pTypeEl.GetString() ?? "CP4") : "CP4";
                var eiscIpId = procEl.TryGetProperty("eiscIpId", out var pIpIdEl) ? (pIpIdEl.GetString() ?? "0x03") : "0x03";
                var eiscIpAddress = procEl.TryGetProperty("eiscIpAddress", out var pIpEl) ? (pIpEl.GetString() ?? "127.0.0.2") : "127.0.0.2";

                if (string.IsNullOrWhiteSpace(id))
                    id = $"proc-{processors.Count + 1}";

                processors.Add(new
                {
                    id,
                    processor = string.IsNullOrWhiteSpace(procType) ? "CP4" : procType,
                    eiscIpId = string.IsNullOrWhiteSpace(eiscIpId) ? "0x03" : eiscIpId,
                    eiscIpAddress = string.IsNullOrWhiteSpace(eiscIpAddress) ? "127.0.0.2" : eiscIpAddress,
                });
            }
        }

        if (processors.Count == 0)
        {
            processors.Add(new { id = "main", processor = "CP4", eiscIpId = "0x03", eiscIpAddress = "127.0.0.2" });
            assumptions.Add("No processors specified; defaulted to one CP4 processor (main).");
        }

        var primaryProcessor = JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(processors[0]));
        var primaryProcessorId = primaryProcessor.GetProperty("id").GetString() ?? "main";

        var allowedSubsystems = new HashSet<string>(new[] { "av", "lighting", "shades", "hvac", "security" }, StringComparer.OrdinalIgnoreCase);
        var rooms = new List<object>();
        var roomOffset = 0;

        if (root.TryGetProperty("rooms", out var roomsEl) && roomsEl.ValueKind == JsonValueKind.Array)
        {
            var roomIndex = 1;
            foreach (var roomEl in roomsEl.EnumerateArray())
            {
                var roomName = roomEl.TryGetProperty("name", out var roomNameEl)
                    ? (roomNameEl.GetString() ?? "")
                    : "";
                if (string.IsNullOrWhiteSpace(roomName))
                {
                    roomName = $"Room {roomIndex}";
                    assumptions.Add($"Room {roomIndex} was missing a name; assigned '{roomName}'.");
                }

                var roomType = roomEl.TryGetProperty("roomType", out var roomTypeEl)
                    ? (roomTypeEl.GetString() ?? "standard")
                    : "standard";
                roomType = roomType.Equals("technical", StringComparison.OrdinalIgnoreCase) ? "technical" : "standard";

                var processorId = roomEl.TryGetProperty("processorId", out var roomProcEl)
                    ? (roomProcEl.GetString() ?? "")
                    : "";
                if (string.IsNullOrWhiteSpace(processorId))
                    processorId = primaryProcessorId;

                var subsystems = new List<string>();
                if (roomType == "technical")
                {
                    subsystems = new List<string>();
                }
                else if (roomEl.TryGetProperty("subsystems", out var roomSubsystemsEl) && roomSubsystemsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var subEl in roomSubsystemsEl.EnumerateArray())
                    {
                        var sub = (subEl.GetString() ?? "").Trim().ToLowerInvariant();
                        if (allowedSubsystems.Contains(sub) && !subsystems.Contains(sub))
                        {
                            subsystems.Add(sub);
                        }
                    }
                }

                if (subsystems.Count == 0 && roomType != "technical")
                {
                    subsystems.Add("av");
                    subsystems.Add("lighting");
                    assumptions.Add($"Room '{roomName}' had no valid subsystems; defaulted to av + lighting.");
                }

                rooms.Add(new
                {
                    id = Slugify(roomName),
                    name = roomName,
                    joinOffset = roomOffset,
                    processorId,
                    roomType,
                    subsystems,
                    devices = new Dictionary<string, object>(),
                    sources = Array.Empty<string>(),
                });

                roomOffset += 100;
                roomIndex++;
            }
        }

        if (rooms.Count == 0)
        {
            rooms.Add(new
            {
                id = "main-room",
                name = "Main Room",
                joinOffset = 0,
                processorId = primaryProcessorId,
                roomType = "standard",
                subsystems = new[] { "av", "lighting" },
                devices = new Dictionary<string, object>(),
                sources = Array.Empty<string>(),
            });
            assumptions.Add("No rooms specified; created a default 'Main Room'.");
        }

        var scaffoldConfig = new
        {
            schemaVersion = "1.0",
            projectId,
            processor = "CP4",
            system = new
            {
                name = systemName,
                eiscIpId = primaryProcessor.GetProperty("eiscIpId").GetString() ?? "0x03",
                eiscIpAddress = primaryProcessor.GetProperty("eiscIpAddress").GetString() ?? "127.0.0.2",
                processors,
            },
            rooms,
            sources = Array.Empty<object>(),
            scenes = Array.Empty<object>(),
        };

        return Results.Json(new
        {
            config = scaffoldConfig,
            report = new
            {
                taskCount = tasks.Count,
                integrationCount = integrations.Count,
                assumptions,
            },
        });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

// --- Export SystemConfig bundle endpoint ---
app.MapGet("/api/systemconfig/export", async () =>
{
    if (!File.Exists(systemConfigPath))
    {
        return Results.NotFound(new { message = "SystemConfig file not found." });
    }

    try
    {
        await fileLock.WaitAsync();
        string configJson;
        try
        {
            configJson = await File.ReadAllTextAsync(systemConfigPath);
        }
        finally
        {
            fileLock.Release();
        }

        var contract = JoinContractBuilder.Build(configJson);

        // Collect device profile IDs from config
        var profileIds = new List<string>();
        using var doc = JsonDocument.Parse(configJson);
        if (doc.RootElement.TryGetProperty("rooms", out var roomsEl))
        {
            foreach (var room in roomsEl.EnumerateArray())
            {
                if (room.TryGetProperty("devices", out var devicesEl))
                {
                    foreach (var dev in devicesEl.EnumerateObject())
                    {
                        if (dev.Value.TryGetProperty("profileId", out var profileProp))
                        {
                            var id = profileProp.GetString();
                            if (!string.IsNullOrEmpty(id) && !profileIds.Contains(id))
                            {
                                profileIds.Add(id);
                            }
                        }
                    }
                }
            }
        }

        var configParsed = JsonSerializer.Deserialize<JsonElement>(configJson);
        return Results.Json(new
        {
            systemConfig = configParsed,
            joinContract = contract,
            deviceProfileIds = profileIds,
        });
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to read SystemConfig for export.");
        return Results.Problem("Unable to export configuration.");
    }
    catch (JsonException ex)
    {
        logger.LogError(ex, "Invalid SystemConfig JSON for export.");
        return Results.BadRequest(new { message = "SystemConfig contains invalid JSON." });
    }
});

// --- Join Contract endpoint (computed server-side) ---
app.MapGet("/api/joincontract", async () =>
{
    if (!File.Exists(systemConfigPath))
    {
        return Results.NotFound(new { message = "SystemConfig file not found." });
    }

    try
    {
        await fileLock.WaitAsync();
        string configJson;
        try
        {
            configJson = await File.ReadAllTextAsync(systemConfigPath);
        }
        finally
        {
            fileLock.Release();
        }

        var contract = JoinContractBuilder.Build(configJson);
        return Results.Json(contract);
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to read SystemConfig for join contract.");
        return Results.Problem("Unable to generate join contract.");
    }
    catch (JsonException ex)
    {
        logger.LogError(ex, "Invalid SystemConfig JSON.");
        return Results.BadRequest(new { message = "SystemConfig contains invalid JSON." });
    }
});

// --- Devices endpoints ---
app.MapGet("/api/devices", () =>
{
    if (!Directory.Exists(devicesPath))
    {
        return Results.NotFound(new { message = "Devices directory not found." });
    }

    try
    {
        var files = Directory.GetFiles(devicesPath, "*.json", SearchOption.AllDirectories);
        var devices = new List<JsonElement>();
        foreach (var file in files)
        {
            var json = File.ReadAllText(file);
            var doc = JsonDocument.Parse(json);
            devices.Add(doc.RootElement.Clone());
        }
        return Results.Json(devices);
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to read devices directory.");
        return Results.Problem("Unable to read device profiles.");
    }
});

// --- Catalog endpoint (generated module index) ---
app.MapGet("/api/catalog", () =>
{
    var catalogPath = Path.Combine(devicesPath, "catalog.json");
    if (!File.Exists(catalogPath))
    {
        return Results.NotFound(new { message = "Catalog not found. Run UspProfileGenerator to generate it." });
    }

    try
    {
        string json = File.ReadAllText(catalogPath);
        return Results.Text(json, "application/json");
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to read catalog.");
        return Results.Problem("Unable to read device catalog.");
    }
});

app.MapGet("/api/devices/{id}", (string id) =>
{
    if (!Directory.Exists(devicesPath))
    {
        return Results.NotFound(new { message = "Devices directory not found." });
    }

    try
    {
        var files = Directory.GetFiles(devicesPath, "*.json", SearchOption.AllDirectories);
        foreach (var file in files)
        {
            var json = File.ReadAllText(file);
            var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("id", out var idProp)
                && string.Equals(idProp.GetString(), id, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Text(json, "application/json");
            }
        }
        return Results.NotFound(new { message = $"Device '{id}' not found." });
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to read device profile.");
        return Results.Problem("Unable to read device profile.");
    }
});

// --- Create device profile ---
app.MapPost("/api/devices", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { message = "Empty payload." });
    }

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        if (!root.TryGetProperty("id", out var idProp) || string.IsNullOrWhiteSpace(idProp.GetString()))
        {
            return Results.BadRequest(new { message = "id is required." });
        }
        if (!root.TryGetProperty("manufacturer", out var mfr) || string.IsNullOrWhiteSpace(mfr.GetString()))
        {
            return Results.BadRequest(new { message = "manufacturer is required." });
        }
        if (!root.TryGetProperty("model", out var model) || string.IsNullOrWhiteSpace(model.GetString()))
        {
            return Results.BadRequest(new { message = "model is required." });
        }
        if (!root.TryGetProperty("category", out var cat) || string.IsNullOrWhiteSpace(cat.GetString()))
        {
            return Results.BadRequest(new { message = "category is required." });
        }
        if (!root.TryGetProperty("protocols", out var proto) || proto.ValueKind != JsonValueKind.Object)
        {
            return Results.BadRequest(new { message = "protocols must be an object with at least one entry." });
        }

        var deviceId = idProp.GetString()!;
        var filePath = Path.Combine(devicesPath, $"{deviceId}.json");

        if (File.Exists(filePath))
        {
            return Results.Conflict(new { message = $"Device '{deviceId}' already exists." });
        }

        Directory.CreateDirectory(devicesPath);
        await File.WriteAllTextAsync(filePath, body);
        logger.LogInformation("Created device profile: {Id}", deviceId);
        return Results.Created($"/api/devices/{deviceId}", JsonSerializer.Deserialize<JsonElement>(body));
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

// --- Update device profile ---
app.MapPut("/api/devices/{id}", async (string id, HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { message = "Empty payload." });
    }

    try
    {
        // Find existing file
        var filePath = FindDeviceFile(devicesPath, id);
        if (filePath == null)
        {
            return Results.NotFound(new { message = $"Device '{id}' not found." });
        }

        using var doc = JsonDocument.Parse(body);
        await File.WriteAllTextAsync(filePath, body);
        logger.LogInformation("Updated device profile: {Id}", id);
        return Results.Ok(new { message = "Device updated." });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

// --- Clone device profile ---
app.MapPost("/api/devices/{id}/clone", async (string id) =>
{
    try
    {
        var filePath = FindDeviceFile(devicesPath, id);
        if (filePath == null)
        {
            return Results.NotFound(new { message = $"Device '{id}' not found." });
        }

        var json = await File.ReadAllTextAsync(filePath);
        using var doc = JsonDocument.Parse(json);

        // Generate new ID
        var newId = $"{id}-copy";
        var suffix = 2;
        while (File.Exists(Path.Combine(devicesPath, $"{newId}.json")))
        {
            newId = $"{id}-copy-{suffix}";
            suffix++;
        }

        // Replace the id in the JSON
        var newJson = json;
        using var original = JsonDocument.Parse(json);
        var options = new JsonSerializerOptions { WriteIndented = true };
        var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
        if (dict != null)
        {
            dict["id"] = JsonSerializer.Deserialize<JsonElement>($"\"{newId}\"");
            newJson = JsonSerializer.Serialize(dict, options);
        }

        var newFilePath = Path.Combine(devicesPath, $"{newId}.json");
        await File.WriteAllTextAsync(newFilePath, newJson);
        logger.LogInformation("Cloned device {Source} -> {Target}", id, newId);
        return Results.Created($"/api/devices/{newId}", JsonSerializer.Deserialize<JsonElement>(newJson));
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to clone device profile.");
        return Results.Problem("Unable to clone device profile.");
    }
});

// --- Delete device profile ---
app.MapDelete("/api/devices/{id}", (string id) =>
{
    try
    {
        var filePath = FindDeviceFile(devicesPath, id);
        if (filePath == null)
        {
            return Results.NotFound(new { message = $"Device '{id}' not found." });
        }

        File.Delete(filePath);
        logger.LogInformation("Deleted device profile: {Id}", id);
        return Results.Ok(new { message = "Device deleted." });
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to delete device profile.");
        return Results.Problem("Unable to delete device profile.");
    }
});

// --- Project CRUD endpoints ---
app.MapGet("/api/projects", () =>
{
    try
    {
        if (!Directory.Exists(projectsPath))
        {
            return Results.Json(Array.Empty<object>());
        }

        var files = Directory.GetFiles(projectsPath, "*.json");
        var projects = new List<object>();
        foreach (var file in files)
        {
            try
            {
                var json = File.ReadAllText(file);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                projects.Add(new
                {
                    id = root.TryGetProperty("projectId", out var pid) ? pid.GetString() : Path.GetFileNameWithoutExtension(file),
                    name = root.TryGetProperty("system", out var sys) && sys.TryGetProperty("name", out var sn) ? sn.GetString() : Path.GetFileNameWithoutExtension(file),
                    rooms = root.TryGetProperty("rooms", out var rooms) && rooms.ValueKind == JsonValueKind.Array ? rooms.GetArrayLength() : 0,
                    modified = File.GetLastWriteTimeUtc(file).ToString("o"),
                    fileName = Path.GetFileName(file),
                });
            }
            catch { /* skip unparseable files */ }
        }
        return Results.Json(projects);
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to list projects.");
        return Results.Problem("Unable to list projects.");
    }
});

app.MapGet("/api/projects/{id}", (string id) =>
{
    try
    {
        var filePath = Path.Combine(projectsPath, $"{id}.json");
        if (!File.Exists(filePath))
        {
            return Results.NotFound(new { message = $"Project '{id}' not found." });
        }
        var json = File.ReadAllText(filePath);
        return Results.Text(json, "application/json");
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to read project.");
        return Results.Problem("Unable to read project.");
    }
});

app.MapPost("/api/projects", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { message = "Empty payload." });
    }

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var projectId = root.TryGetProperty("projectId", out var pid) ? pid.GetString() : null;
        if (string.IsNullOrWhiteSpace(projectId))
        {
            return Results.BadRequest(new { message = "projectId is required." });
        }

        var filePath = Path.Combine(projectsPath, $"{projectId}.json");
        Directory.CreateDirectory(projectsPath);
        await File.WriteAllTextAsync(filePath, body);
        logger.LogInformation("Saved project: {Id}", projectId);
        return Results.Ok(new { message = "Project saved.", id = projectId });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapDelete("/api/projects/{id}", (string id) =>
{
    try
    {
        var filePath = Path.Combine(projectsPath, $"{id}.json");
        if (!File.Exists(filePath))
        {
            return Results.NotFound(new { message = $"Project '{id}' not found." });
        }
        File.Delete(filePath);
        logger.LogInformation("Deleted project: {Id}", id);
        return Results.Ok(new { message = "Project deleted." });
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to delete project.");
        return Results.Problem("Unable to delete project.");
    }
});

app.MapPost("/api/projects/import", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    if (string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { message = "Empty payload." });
    }

    if (!TryValidateSystemConfig(body, out var error))
    {
        return Results.BadRequest(new { message = $"Invalid project config: {error}" });
    }

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var projectId = root.TryGetProperty("projectId", out var pid) ? pid.GetString() : null;
        if (string.IsNullOrWhiteSpace(projectId))
        {
            return Results.BadRequest(new { message = "projectId is required." });
        }

        var filePath = Path.Combine(projectsPath, $"{projectId}.json");
        Directory.CreateDirectory(projectsPath);
        await File.WriteAllTextAsync(filePath, body);
        logger.LogInformation("Imported project: {Id}", projectId);
        return Results.Ok(new { message = "Project imported.", id = projectId });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/projects/{id}/activate", async (string id) =>
{
    try
    {
        var filePath = Path.Combine(projectsPath, $"{id}.json");
        if (!File.Exists(filePath))
        {
            return Results.NotFound(new { message = $"Project '{id}' not found." });
        }

        var json = await File.ReadAllTextAsync(filePath);

        // Validate before activating
        if (!TryValidateSystemConfig(json, out var error))
        {
            return Results.BadRequest(new { message = $"Cannot activate invalid config: {error}" });
        }

        await fileLock.WaitAsync();
        try
        {
            var tempPath = systemConfigPath + ".tmp";
            await File.WriteAllTextAsync(tempPath, json);
            File.Move(tempPath, systemConfigPath, overwrite: true);
        }
        finally
        {
            fileLock.Release();
        }

        logger.LogInformation("Activated project: {Id}", id);
        return Results.Ok(new { message = "Project activated as SystemConfig." });
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to activate project.");
        return Results.Problem("Unable to activate project.");
    }
});

app.MapPost("/api/projects/{id}/bootstrap-repo", async (string id, HttpRequest request) =>
{
    try
    {
        var filePath = Path.Combine(projectsPath, $"{id}.json");
        if (!File.Exists(filePath))
        {
            return Results.NotFound(new { message = $"Project '{id}' not found." });
        }

        bool initializeGit = true;
        string repoFolderName = id;
        try
        {
            using var reader = new StreamReader(request.Body);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (root.TryGetProperty("initializeGit", out var initEl) && initEl.ValueKind == JsonValueKind.False)
                    initializeGit = false;
                if (root.TryGetProperty("repoFolderName", out var folderEl))
                {
                    var custom = folderEl.GetString();
                    if (!string.IsNullOrWhiteSpace(custom))
                        repoFolderName = Slugify(custom);
                }
            }
        }
        catch { }

        var configJson = await File.ReadAllTextAsync(filePath);
        if (!TryValidateSystemConfig(configJson, out var validateErr))
        {
            return Results.BadRequest(new { message = $"Cannot bootstrap repo from invalid project: {validateErr}" });
        }

        var repoPath = Path.Combine(projectReposPath, repoFolderName);
        Directory.CreateDirectory(repoPath);

        var contract = JoinContractBuilder.Build(configJson);
        var joinListJson = DeploymentManager.GenerateJoinListJson(configJson);

        await File.WriteAllTextAsync(Path.Combine(repoPath, "SystemConfig.json"), configJson);
        await File.WriteAllTextAsync(Path.Combine(repoPath, "JoinContract.json"), JsonSerializer.Serialize(contract, new JsonSerializerOptions { WriteIndented = true }));
        await File.WriteAllTextAsync(Path.Combine(repoPath, "JoinList.json"), joinListJson);

        var readme = $"# {id}\\n\\nGenerated project workspace for Crestron CP4.\\n\\n## Files\\n- SystemConfig.json\\n- JoinContract.json\\n- JoinList.json\\n\\n## Workflow\\n1. Edit SystemConfig.json\\n2. Regenerate/validate joins via app\\n3. Deploy to CP4 from Configure -> Deploy\\n";
        await File.WriteAllTextAsync(Path.Combine(repoPath, "README.md"), readme);

        var gitignore = "bin/\\nobj/\\n.vscode/\\n*.user\\n*.suo\\n";
        await File.WriteAllTextAsync(Path.Combine(repoPath, ".gitignore"), gitignore);

        bool gitInitialized = false;
        string gitMessage = "Git initialization skipped.";

        if (initializeGit)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "git",
                    Arguments = "init",
                    WorkingDirectory = repoPath,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };
                using var proc = Process.Start(psi);
                if (proc != null)
                {
                    await proc.WaitForExitAsync();
                    gitInitialized = proc.ExitCode == 0;
                    var stdOut = await proc.StandardOutput.ReadToEndAsync();
                    var stdErr = await proc.StandardError.ReadToEndAsync();
                    gitMessage = string.IsNullOrWhiteSpace(stdErr) ? (stdOut.Trim() == "" ? "git init completed" : stdOut.Trim()) : stdErr.Trim();
                }
            }
            catch (Exception ex)
            {
                gitMessage = $"git init failed: {ex.Message}";
            }
        }

        logger.LogInformation("Bootstrapped repository for project {Id} at {RepoPath}", id, repoPath);
        return Results.Ok(new
        {
            message = "Project repository bootstrapped.",
            repoPath,
            gitInitialized,
            gitMessage,
        });
    }
    catch (IOException ex)
    {
        logger.LogError(ex, "Failed to bootstrap repository for project {Id}", id);
        return Results.Problem("Unable to bootstrap project repository.");
    }
});

app.MapGet("/api/integrations/proof", async () =>
{
    if (!File.Exists(systemConfigPath))
    {
        return Results.NotFound(new { message = "SystemConfig file not found." });
    }

    try
    {
        await fileLock.WaitAsync();
        string configJson;
        try
        {
            configJson = await File.ReadAllTextAsync(systemConfigPath);
        }
        finally
        {
            fileLock.Release();
        }

        if (!TryValidateSystemConfig(configJson, out var validationError))
        {
            return Results.Ok(new
            {
                ready = false,
                message = "SystemConfig is invalid.",
                validationError,
            });
        }

        using var doc = JsonDocument.Parse(configJson);
        var root = doc.RootElement;

        var integrations = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase)
        {
            ["BACnet"] = new(),
            ["KNX"] = new(),
            ["Lutron QSX"] = new(),
            ["Lutron QS Telnet"] = new(),
        };

        if (root.TryGetProperty("rooms", out var roomsEl) && roomsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var roomEl in roomsEl.EnumerateArray())
            {
                var roomId = roomEl.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                if (!roomEl.TryGetProperty("devices", out var devicesEl) || devicesEl.ValueKind != JsonValueKind.Object) continue;

                foreach (var dev in devicesEl.EnumerateObject())
                {
                    var role = dev.Name;
                    var profileId = dev.Value.TryGetProperty("profileId", out var pEl) ? (pEl.GetString() ?? "") : "";
                    var protocol = dev.Value.TryGetProperty("protocol", out var prEl) ? (prEl.GetString() ?? "") : "";
                    var port = dev.Value.TryGetProperty("port", out var poEl) ? (poEl.GetString() ?? "") : "";
                    var address = dev.Value.TryGetProperty("address", out var addrEl) ? (addrEl.GetString() ?? "") : "";

                    var normalizedProfile = profileId.ToLowerInvariant();
                    var normalizedRole = role.ToLowerInvariant();
                    var normalizedProtocol = protocol.ToLowerInvariant();
                    var normalizedPort = port.ToLowerInvariant();

                    object evidence = new { roomId, role, profileId, protocol, port, address };

                    if (normalizedProtocol == "bacnet" || normalizedProfile.Contains("bacnet") || normalizedRole.Contains("bacnet"))
                        integrations["BACnet"].Add(evidence);

                    if (normalizedProtocol == "knx" || normalizedProfile.Contains("knx") || normalizedRole.Contains("knx"))
                        integrations["KNX"].Add(evidence);

                    if (normalizedProfile.Contains("qsx") || normalizedRole.Contains("qsx") || (normalizedProfile.Contains("lutron") && normalizedProtocol == "ip" && normalizedPort == "8081"))
                        integrations["Lutron QSX"].Add(evidence);

                    if (normalizedProfile.Contains("qs-telnet") || normalizedRole.Contains("telnet") || (normalizedProfile.Contains("lutron") && normalizedProtocol == "ip" && normalizedPort == "23"))
                        integrations["Lutron QS Telnet"].Add(evidence);
                }
            }
        }

        var contract = JoinContractBuilder.Build(configJson);
        var contractJson = JsonSerializer.Serialize(contract);
        int totalJoins = 0;
        using (var contractDoc = JsonDocument.Parse(contractJson))
        {
            var contractRoot = contractDoc.RootElement;
            if (contractRoot.TryGetProperty("rooms", out var cRooms) && cRooms.ValueKind == JsonValueKind.Array)
            {
                foreach (var cRoom in cRooms.EnumerateArray())
                {
                    if (cRoom.TryGetProperty("joins", out var joinsObj))
                    {
                        if (joinsObj.TryGetProperty("digital", out var d) && d.ValueKind == JsonValueKind.Array) totalJoins += d.GetArrayLength();
                        if (joinsObj.TryGetProperty("analog", out var a) && a.ValueKind == JsonValueKind.Array) totalJoins += a.GetArrayLength();
                        if (joinsObj.TryGetProperty("serial", out var s) && s.ValueKind == JsonValueKind.Array) totalJoins += s.GetArrayLength();
                    }
                }
            }
            if (contractRoot.TryGetProperty("system", out var cSystem))
            {
                if (cSystem.TryGetProperty("digital", out var sd) && sd.ValueKind == JsonValueKind.Array) totalJoins += sd.GetArrayLength();
                if (cSystem.TryGetProperty("serial", out var ss) && ss.ValueKind == JsonValueKind.Array) totalJoins += ss.GetArrayLength();
            }
        }

        var report = integrations.Select(kvp => new
        {
            integration = kvp.Key,
            configured = kvp.Value.Count > 0,
            count = kvp.Value.Count,
            evidence = kvp.Value,
            feedbackReady = kvp.Value.Count > 0 && totalJoins > 0,
        }).ToList();

        var preview = await DeploymentManager.PreviewFiles(systemConfigPath, joinListPath, fileLock);
        var transferFiles = preview.files ?? new List<object>();
        return Results.Ok(new
        {
            ready = true,
            transferReady = transferFiles.Count > 0,
            transferFiles,
            joinCount = totalJoins,
            integrationReport = report,
            note = string.IsNullOrWhiteSpace(preview.error)
                ? "Feedback proof is based on config + join contract + deployable files. On-hardware feedback confirmation still requires live CP4 execution and runtime signal checks."
                : $"Preview warning: {preview.error}. On-hardware feedback confirmation still requires live CP4 execution and runtime signal checks.",
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to build integration proof report.");
        return Results.Problem("Unable to generate integration proof report.");
    }
});

app.MapGet("/api/attachments/analyze", () =>
{
    try
    {
        int CountXmlMembers(string xmlPath)
        {
            try
            {
                var text = File.ReadAllText(xmlPath);
                int count = 0;
                int idx = 0;
                const string token = "<member name=";
                while ((idx = text.IndexOf(token, idx, StringComparison.Ordinal)) >= 0)
                {
                    count++;
                    idx += token.Length;
                }
                return count;
            }
            catch
            {
                return 0;
            }
        }

        object? pdfMeta(string path)
        {
            if (!File.Exists(path)) return new { path, exists = false };
            var fi = new FileInfo(path);
            return new { path, exists = true, sizeBytes = fi.Length, modifiedUtc = fi.LastWriteTimeUtc };
        }

        var sdkExists = Directory.Exists(driversSdkPath);
        var sdkSummary = new
        {
            path = driversSdkPath,
            exists = sdkExists,
            topLevel = sdkExists
                ? Directory.GetDirectories(driversSdkPath).Select(Path.GetFileName).ToArray()
                : Array.Empty<string>(),
            zipArtifacts = sdkExists
                ? Directory.GetFiles(driversSdkPath, "*.zip", SearchOption.AllDirectories)
                    .Select(p => new { name = Path.GetFileName(p), path = p, sizeBytes = new FileInfo(p).Length })
                    .ToArray()
                : Array.Empty<object>(),
            xmlLibraries = sdkExists
                ? Directory.GetFiles(Path.Combine(driversSdkPath, "Libraries"), "*.xml", SearchOption.TopDirectoryOnly)
                    .Select(p => new
                    {
                        name = Path.GetFileName(p),
                        path = p,
                        sizeBytes = new FileInfo(p).Length,
                        memberCount = CountXmlMembers(p),
                    })
                    .ToArray()
                : Array.Empty<object>(),
        };

        return Results.Ok(new
        {
            analyzedAtUtc = DateTime.UtcNow,
            sdk = sdkSummary,
            ch5ReleaseNotes = pdfMeta(ch5ReleaseNotesPath),
            sdkCdPdf = pdfMeta(sdkCdPdfPath),
            note = "Attachments are indexed and exposed for agent workflows. Raw PDFs are not transformed by default; metadata + SDK XML inventories are included.",
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to analyze attached assets.");
        return Results.Problem("Unable to analyze attached assets.");
    }
});

app.MapGet("/api/xpanel/analyze", async () =>
{
    try
    {
        var sourceExists = Directory.Exists(xpanelSourceRoot);
        var packageExists = Directory.Exists(xpanelPackageRoot);

        var keyFiles = new[]
        {
            "package.json",
            Path.Combine("src", "app"),
            Path.Combine("src", "index.css"),
        };

        var keyChecks = keyFiles.Select(k =>
        {
            var fullPath = Path.Combine(xpanelSourceRoot, k);
            var exists = File.Exists(fullPath) || Directory.Exists(fullPath);
            return new { key = k.Replace("\\", "/"), exists, path = fullPath };
        }).ToArray();

        var sourceFiles = sourceExists
            ? Directory.GetFiles(xpanelSourceRoot, "*.*", SearchOption.AllDirectories)
                .Where(f =>
                    !f.Contains("\\node_modules\\", StringComparison.OrdinalIgnoreCase)
                    && !f.Contains("\\dist\\", StringComparison.OrdinalIgnoreCase)
                    && !f.Contains("\\.git\\", StringComparison.OrdinalIgnoreCase)
                    && (f.EndsWith(".ts", StringComparison.OrdinalIgnoreCase)
                        || f.EndsWith(".tsx", StringComparison.OrdinalIgnoreCase)
                        || f.EndsWith(".js", StringComparison.OrdinalIgnoreCase)
                        || f.EndsWith(".jsx", StringComparison.OrdinalIgnoreCase)
                        || f.EndsWith(".css", StringComparison.OrdinalIgnoreCase)
                        || f.EndsWith(".html", StringComparison.OrdinalIgnoreCase)))
                .ToArray()
            : Array.Empty<string>();

        int CountToken(string text, string token)
        {
            var count = 0;
            var idx = 0;
            while ((idx = text.IndexOf(token, idx, StringComparison.OrdinalIgnoreCase)) >= 0)
            {
                count++;
                idx += token.Length;
            }
            return count;
        }

        var tokenCountDataJoin = 0;
        var tokenCountDigital = 0;
        var tokenCountAnalog = 0;
        var tokenCountSerial = 0;

        foreach (var file in sourceFiles)
        {
            string content;
            try
            {
                content = await File.ReadAllTextAsync(file);
            }
            catch
            {
                continue;
            }

            tokenCountDataJoin += CountToken(content, "data-join");
            tokenCountDigital += CountToken(content, "data-join-digital");
            tokenCountAnalog += CountToken(content, "data-join-analog");
            tokenCountSerial += CountToken(content, "data-join-serial");
        }

        var hasSystemConfig = File.Exists(systemConfigPath);
        var joinContractAvailable = false;
        var joinContractRoomCount = 0;
        var joinContractJoinCount = 0;
        string? joinContractError = null;

        if (hasSystemConfig)
        {
            try
            {
                await fileLock.WaitAsync();
                var configJson = await File.ReadAllTextAsync(systemConfigPath);
                if (TryValidateSystemConfig(configJson, out var validationError))
                {
                    var contract = JoinContractBuilder.Build(configJson);
                    joinContractAvailable = true;
                    using var contractDoc = JsonDocument.Parse(JsonSerializer.Serialize(contract));
                    var rooms = contractDoc.RootElement.GetProperty("rooms");
                    joinContractRoomCount = rooms.GetArrayLength();
                    foreach (var room in rooms.EnumerateArray())
                    {
                        var joins = room.GetProperty("joins");
                        joinContractJoinCount += joins.GetProperty("digital").GetArrayLength();
                        joinContractJoinCount += joins.GetProperty("analog").GetArrayLength();
                        joinContractJoinCount += joins.GetProperty("serial").GetArrayLength();
                    }
                }
                else
                {
                    joinContractError = validationError;
                }
            }
            catch (Exception ex)
            {
                joinContractError = ex.Message;
            }
            finally
            {
                fileLock.Release();
            }
        }

        return Results.Ok(new
        {
            analyzedAtUtc = DateTime.UtcNow,
            source = new
            {
                path = xpanelSourceRoot,
                exists = sourceExists,
                keyChecks,
                candidateSourceFileCount = sourceFiles.Length,
            },
            package = new
            {
                path = xpanelPackageRoot,
                exists = packageExists,
                liveDistPath = Path.Combine(xpanelPackageRoot, "dist"),
                liveDistExists = Directory.Exists(Path.Combine(xpanelPackageRoot, "dist")),
                liveUrl = "/xpanel/live/",
            },
            joinAttributeCounts = new
            {
                dataJoin = tokenCountDataJoin,
                dataJoinDigital = tokenCountDigital,
                dataJoinAnalog = tokenCountAnalog,
                dataJoinSerial = tokenCountSerial,
            },
            joinContract = new
            {
                systemConfigPath,
                hasSystemConfig,
                available = joinContractAvailable,
                roomCount = joinContractRoomCount,
                joinCount = joinContractJoinCount,
                error = joinContractError,
            },
            note = "Analyze confirms source/package readiness and join-bindability indicators. Use /api/xpanel/prepare-package to build staging artifacts.",
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to analyze XPanel assets.");
        return Results.Problem("Unable to analyze XPanel assets.");
    }
});

app.MapPost("/api/xpanel/prepare-package", async (HttpRequest request) =>
{
    try
    {
        var runBuild = false;
        string processorIp = string.Empty;
        int processorPort = 41794;
        string ipid = "0x03";

        try
        {
            using var reader = new StreamReader(request.Body);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (root.TryGetProperty("runBuild", out var runBuildEl) && runBuildEl.ValueKind == JsonValueKind.True)
                    runBuild = true;
                if (root.TryGetProperty("processorIp", out var processorIpEl) && processorIpEl.ValueKind == JsonValueKind.String)
                    processorIp = processorIpEl.GetString() ?? string.Empty;
                if (root.TryGetProperty("processorPort", out var processorPortEl) && processorPortEl.ValueKind == JsonValueKind.Number)
                    processorPort = processorPortEl.GetInt32();
                if (root.TryGetProperty("ipid", out var ipidEl) && ipidEl.ValueKind == JsonValueKind.String)
                    ipid = ipidEl.GetString() ?? "0x03";
            }
        }
        catch
        {
        }

        if (!Directory.Exists(xpanelSourceRoot))
        {
            return Results.BadRequest(new { message = "XPanel source root does not exist.", source = xpanelSourceRoot });
        }

        if (!File.Exists(systemConfigPath))
        {
            return Results.BadRequest(new { message = "SystemConfig file not found. Generate or save project config first." });
        }

        var stageToken = DateTime.UtcNow.ToString("yyyyMMddHHmmssfff");
        var sourceStagePath = Path.Combine(xpanelPackageRoot, "source-" + stageToken);
        var joinBridgePath = Path.Combine(xpanelPackageRoot, "join-bridge");
        var buildOutputPath = Path.Combine(xpanelPackageRoot, "dist");

        Directory.CreateDirectory(xpanelPackageRoot);
        ResetDirectoryContents(joinBridgePath);
        if (runBuild)
        {
            ResetDirectoryContents(buildOutputPath);
        }

        foreach (var oldStage in Directory.GetDirectories(xpanelPackageRoot, "source-*", SearchOption.TopDirectoryOnly))
        {
            if (string.Equals(oldStage, sourceStagePath, StringComparison.OrdinalIgnoreCase))
                continue;

            try
            {
                DeleteDirectoryWithRetry(oldStage, 2);
            }
            catch
            {
            }
        }

        Directory.CreateDirectory(sourceStagePath);

        CopyDirectoryFiltered(xpanelSourceRoot, sourceStagePath, new[] { "node_modules", "dist", ".git" });

        string configJson;
        try
        {
            await fileLock.WaitAsync();
            configJson = await File.ReadAllTextAsync(systemConfigPath);
        }
        finally
        {
            fileLock.Release();
        }

        if (!TryValidateSystemConfig(configJson, out var configValidationError))
        {
            return Results.BadRequest(new { message = $"SystemConfig is invalid: {configValidationError}" });
        }

        var joinBridgeJson = JsonSerializer.Serialize(JoinContractBuilder.Build(configJson), new JsonSerializerOptions { WriteIndented = true });
        var joinListJson = DeploymentManager.GenerateJoinListJson(configJson);

        var joinBridgeFile = Path.Combine(joinBridgePath, "JoinBridge.generated.json");
        var joinListFile = Path.Combine(joinBridgePath, "JoinList.generated.json");
        var connectionFile = Path.Combine(joinBridgePath, "Connection.generated.json");

        await File.WriteAllTextAsync(joinBridgeFile, joinBridgeJson);
        await File.WriteAllTextAsync(joinListFile, joinListJson);
        await File.WriteAllTextAsync(connectionFile, JsonSerializer.Serialize(new
        {
            generatedAtUtc = DateTime.UtcNow,
            processorIp,
            processorPort,
            ipid,
            note = "Connection hints for XPanel launch. Keep values aligned with processor runtime configuration.",
        }, new JsonSerializerOptions { WriteIndented = true }));

        var commandResults = new List<object>();

        if (runBuild)
        {
            var installResult = await ExecuteShellCommand(
                RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? "npm install --no-audit --no-fund" : "npm install --no-audit --no-fund",
                sourceStagePath);
            commandResults.Add(new { command = "npm install", installResult.exitCode, installResult.stdout, installResult.stderr, installResult.ok });

            if (!installResult.ok)
            {
                return Results.BadRequest(new
                {
                    message = "npm install failed while preparing package.",
                    source = xpanelSourceRoot,
                    package = xpanelPackageRoot,
                    runBuild,
                    commands = commandResults,
                });
            }

            var buildResult = await ExecuteShellCommand("npm run build", sourceStagePath);
            commandResults.Add(new { command = "npm run build", buildResult.exitCode, buildResult.stdout, buildResult.stderr, buildResult.ok });

            if (!buildResult.ok)
            {
                return Results.BadRequest(new
                {
                    message = "npm run build failed while preparing package.",
                    source = xpanelSourceRoot,
                    package = xpanelPackageRoot,
                    runBuild,
                    commands = commandResults,
                });
            }

            var sourceDist = Path.Combine(sourceStagePath, "dist");
            if (Directory.Exists(sourceDist))
            {
                Directory.CreateDirectory(buildOutputPath);
                CopyDirectoryFiltered(sourceDist, buildOutputPath, Array.Empty<string>());
            }
        }

        var artifactFiles = Directory.GetFiles(xpanelPackageRoot, "*.*", SearchOption.AllDirectories)
            .Select(p => new
            {
                relativePath = Path.GetRelativePath(xpanelPackageRoot, p).Replace("\\", "/"),
                sizeBytes = new FileInfo(p).Length,
            })
            .OrderBy(f => f.relativePath)
            .ToArray();

        var launchUrl = "/xpanel/live/";
        if (!string.IsNullOrWhiteSpace(processorIp))
        {
            launchUrl += "?processorIp=" + Uri.EscapeDataString(processorIp)
                + "&processorPort=" + processorPort
                + "&ipid=" + Uri.EscapeDataString(ipid);
        }

        return Results.Ok(new
        {
            preparedAtUtc = DateTime.UtcNow,
            source = xpanelSourceRoot,
            package = xpanelPackageRoot,
            runBuild,
            processorConnection = new { processorIp, processorPort, ipid },
            commands = commandResults,
            artifacts = artifactFiles,
            livePreviewUrl = "/xpanel/live/",
            liveLaunchUrl = launchUrl,
            note = "Package staging complete. Generated join bridge files are under join-bridge/.",
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to prepare XPanel package.");
        return Results.Problem("Unable to prepare XPanel package.");
    }
});

app.MapGet("/api/xpanel/live-status", () =>
{
    var distRoot = Path.Combine(xpanelPackageRoot, "dist");
    var indexPath = Path.Combine(distRoot, "index.html");
    var exists = Directory.Exists(distRoot) && File.Exists(indexPath);
    return Results.Ok(new
    {
        distRoot,
        exists,
        liveUrl = "/xpanel/live/",
        message = exists
            ? "Live XPanel is available."
            : "Live XPanel not available yet. Run /api/xpanel/prepare-package with runBuild=true.",
    });
});

app.MapPost("/api/xpanel/deploy-to-processor", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var ip = root.TryGetProperty("ip", out var ipEl) ? ipEl.GetString() : null;
        var port = root.TryGetProperty("port", out var portEl) && portEl.TryGetInt32(out var p) ? p : 22;
        var username = root.TryGetProperty("username", out var uEl) ? uEl.GetString() : null;
        var password = root.TryGetProperty("password", out var pwEl) ? pwEl.GetString() : null;
        var remoteRoot = root.TryGetProperty("remoteRoot", out var rrEl) ? (rrEl.GetString() ?? "/HTML") : "/HTML";
        var webPath = root.TryGetProperty("webPath", out var wpEl) ? (wpEl.GetString() ?? "/xpanel") : "/xpanel";

        if (string.IsNullOrWhiteSpace(ip)) return Results.BadRequest(new { message = "ip is required." });
        if (string.IsNullOrWhiteSpace(username)) return Results.BadRequest(new { message = "username is required." });
        if (string.IsNullOrWhiteSpace(password)) return Results.BadRequest(new { message = "password is required." });

        var distRoot = Path.Combine(xpanelPackageRoot, "dist");
        if (!Directory.Exists(distRoot) || !File.Exists(Path.Combine(distRoot, "index.html")))
        {
            return Results.BadRequest(new
            {
                message = "XPanel dist output not found. Run /api/xpanel/prepare-package with runBuild=true first.",
                distRoot,
            });
        }

        var normalizedWebPath = ("/" + webPath.Trim()).Replace("\\", "/").Replace("//", "/");
        if (!normalizedWebPath.StartsWith('/')) normalizedWebPath = "/" + normalizedWebPath;
        var remoteBase = (remoteRoot.TrimEnd('/').TrimEnd('\\') + normalizedWebPath).Replace("\\", "/");

        var allFiles = Directory.GetFiles(distRoot, "*", SearchOption.AllDirectories);

        var uploaded = await Task.Run(() =>
        {
            var connectionInfo = new Renci.SshNet.ConnectionInfo(ip, port, username,
                new PasswordAuthenticationMethod(username, password))
            {
                Timeout = TimeSpan.FromSeconds(20),
            };

            using var sftp = new SftpClient(connectionInfo);
            sftp.Connect();

            EnsureSftpDirectory(sftp, remoteRoot.Replace("\\", "/"));
            EnsureSftpDirectory(sftp, remoteBase);

            var count = 0;
            foreach (var localFile in allFiles)
            {
                var rel = Path.GetRelativePath(distRoot, localFile).Replace("\\", "/");
                var remoteFile = remoteBase.TrimEnd('/') + "/" + rel;
                var remoteDir = remoteFile[..remoteFile.LastIndexOf('/')];

                EnsureSftpDirectory(sftp, remoteDir);

                if (string.Equals(rel, "index.html", StringComparison.OrdinalIgnoreCase))
                {
                    var html = File.ReadAllText(localFile);
                    html = html.Replace("\"/assets/", "\"./assets/")
                               .Replace("'/assets/", "'./assets/")
                               .Replace("(\"/assets/", "(\"./assets/")
                               .Replace("('/assets/", "('./assets/");
                    var bytes = Encoding.UTF8.GetBytes(html);
                    using var ms = new MemoryStream(bytes);
                    sftp.UploadFile(ms, remoteFile, true);
                }
                else
                {
                    using var fs = File.OpenRead(localFile);
                    sftp.UploadFile(fs, remoteFile, true);
                }
                count++;
            }

            sftp.Disconnect();
            return count;
        });

        var httpsUrl = $"https://{ip}{normalizedWebPath.TrimEnd('/')}/";
        var httpUrl = $"http://{ip}{normalizedWebPath.TrimEnd('/')}/";

        return Results.Ok(new
        {
            message = "XPanel dist uploaded to processor.",
            processor = new { ip, port, username },
            remote = new { remoteRoot, webPath = normalizedWebPath, remoteBase },
            uploadedFiles = uploaded,
            launch = new { httpsUrl, httpUrl },
            note = "If the page is not found, try remoteRoot '/html' or adjust webPath.",
        });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to deploy XPanel dist to processor.");
        return Results.Problem($"Failed to deploy XPanel dist: {ex.Message}");
    }
});

app.MapPost("/api/xpanel/remote-list", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var ip = root.TryGetProperty("ip", out var ipEl) ? ipEl.GetString() : null;
        var port = root.TryGetProperty("port", out var portEl) && portEl.TryGetInt32(out var p) ? p : 22;
        var username = root.TryGetProperty("username", out var uEl) ? uEl.GetString() : null;
        var password = root.TryGetProperty("password", out var pwEl) ? pwEl.GetString() : null;
        var path = root.TryGetProperty("path", out var pathEl) ? (pathEl.GetString() ?? "/") : "/";
        var findName = root.TryGetProperty("findName", out var findEl) ? (findEl.GetString() ?? "") : "";

        if (string.IsNullOrWhiteSpace(ip)) return Results.BadRequest(new { message = "ip is required." });
        if (string.IsNullOrWhiteSpace(username)) return Results.BadRequest(new { message = "username is required." });
        if (string.IsNullOrWhiteSpace(password)) return Results.BadRequest(new { message = "password is required." });

        var result = await Task.Run(() =>
        {
            var connectionInfo = new Renci.SshNet.ConnectionInfo(ip, port, username,
                new PasswordAuthenticationMethod(username, password))
            {
                Timeout = TimeSpan.FromSeconds(20),
            };

            using var sftp = new SftpClient(connectionInfo);
            sftp.Connect();

            var list = sftp.ListDirectory(path)
                .Where(x => x.Name != "." && x.Name != "..")
                .Select(x => new
                {
                    name = x.Name,
                    fullName = x.FullName,
                    isDirectory = x.IsDirectory,
                    size = x.Attributes?.Size ?? 0,
                    modified = x.LastWriteTimeUtc,
                })
                .OrderByDescending(x => x.isDirectory)
                .ThenBy(x => x.name)
                .ToList();

            List<string> matches = new();
            if (!string.IsNullOrWhiteSpace(findName))
            {
                SearchRemoteByName(sftp, path, findName, depth: 4, matches);
            }

            sftp.Disconnect();
            return new { list, matches };
        });

        return Results.Ok(new
        {
            ip,
            path,
            entries = result.list,
            matches = result.matches,
        });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to list processor filesystem for XPanel deployment.");
        return Results.Problem($"Failed to list remote filesystem: {ex.Message}");
    }
});

app.MapGet("/xpanel/live/{**path}", (string? path) =>
{
    var distRoot = Path.Combine(xpanelPackageRoot, "dist");
    return ServeXpanelLiveFile(distRoot, path);
});

// --- Network Interfaces endpoint ---
app.MapGet("/api/network/interfaces", () =>
{
    var interfaces = NetworkInterface.GetAllNetworkInterfaces()
        .Where(nic => nic.OperationalStatus == OperationalStatus.Up
                   && nic.NetworkInterfaceType != NetworkInterfaceType.Loopback)
        .Select(nic =>
        {
            var props = nic.GetIPProperties();
            var ipv4Info = props.UnicastAddresses
                .FirstOrDefault(a => a.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);
            string addr = ipv4Info?.Address.ToString() ?? "";
            string mask = ipv4Info?.IPv4Mask?.ToString() ?? "";
            int cidr = 0;
            if (ipv4Info?.IPv4Mask != null)
            {
                var maskBytes = ipv4Info.IPv4Mask.GetAddressBytes();
                foreach (var b in maskBytes)
                {
                    for (int bit = 7; bit >= 0; bit--)
                    {
                        if ((b & (1 << bit)) != 0) cidr++;
                        else goto done;
                    }
                }
                done:;
            }
            return new
            {
                id = nic.Id,
                name = nic.Name,
                description = nic.Description,
                type = nic.NetworkInterfaceType.ToString(),
                ipv4 = string.IsNullOrEmpty(addr) ? null : new
                {
                    address = addr,
                    mask = mask,
                    cidr = $"{addr}/{cidr}",
                },
            };
        })
        .Where(n => n.ipv4 != null)
        .ToList();
    return Results.Json(interfaces);
});

// --- Test Connection endpoint ---
app.MapPost("/api/network/test-connection", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();
    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipProp) ? ipProp.GetString() : null;
        var port = root.TryGetProperty("port", out var portProp) ? portProp.GetInt32() : 41794;

        if (string.IsNullOrWhiteSpace(ip))
            return Results.BadRequest(new { message = "ip is required." });

        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            using var client = new TcpClient();
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            await client.ConnectAsync(IPAddress.Parse(ip!), port, cts.Token);
            sw.Stop();
            return Results.Ok(new { reachable = true, latencyMs = sw.ElapsedMilliseconds });
        }
        catch
        {
            sw.Stop();
            return Results.Ok(new { reachable = false, latencyMs = sw.ElapsedMilliseconds });
        }
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

// --- Generate JoinList from SystemConfig ---
app.MapGet("/api/joinlist/generate", async () =>
{
    if (!File.Exists(systemConfigPath))
        return Results.NotFound(new { message = "SystemConfig not found. Create a project first." });

    await fileLock.WaitAsync();
    try
    {
        string json = await File.ReadAllTextAsync(systemConfigPath);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var digital = new List<object>();
        var analog = new List<object>();
        var serial = new List<object>();

        if (root.TryGetProperty("rooms", out var rooms))
        {
            foreach (var room in rooms.EnumerateArray())
            {
                int offset = room.TryGetProperty("joinOffset", out var jo) ? jo.GetInt32() : 0;
                string roomName = room.TryGetProperty("name", out var rn) ? rn.GetString() ?? "" : "";
                var subs = room.TryGetProperty("subsystems", out var subsArr) ? subsArr : default;

                if (subs.ValueKind == JsonValueKind.Array)
                {
                    foreach (var sub in subs.EnumerateArray())
                    {
                        string subName = sub.GetString() ?? "";
                        // Generate standard joins per subsystem
                        if (subName == "av")
                        {
                            digital.Add(new { join = offset + 1, name = $"{roomName}_Power", direction = "output" });
                            digital.Add(new { join = offset + 2, name = $"{roomName}_PowerFb", direction = "input" });
                            analog.Add(new { join = offset + 1, name = $"{roomName}_Volume", direction = "output" });
                            analog.Add(new { join = offset + 2, name = $"{roomName}_VolumeFb", direction = "input" });
                            analog.Add(new { join = offset + 3, name = $"{roomName}_Source", direction = "output" });
                            analog.Add(new { join = offset + 4, name = $"{roomName}_SourceFb", direction = "input" });
                            serial.Add(new { join = offset + 1, name = $"{roomName}_SourceName", direction = "input" });
                        }
                        else if (subName == "lighting")
                        {
                            analog.Add(new { join = offset + 10, name = $"{roomName}_LightLevel", direction = "output" });
                            analog.Add(new { join = offset + 11, name = $"{roomName}_LightLevelFb", direction = "input" });
                        }
                        else if (subName == "shades")
                        {
                            digital.Add(new { join = offset + 10, name = $"{roomName}_ShadesOpen", direction = "output" });
                            digital.Add(new { join = offset + 11, name = $"{roomName}_ShadesClose", direction = "output" });
                            analog.Add(new { join = offset + 20, name = $"{roomName}_ShadesPosition", direction = "input" });
                        }
                        else if (subName == "hvac")
                        {
                            analog.Add(new { join = offset + 30, name = $"{roomName}_TempSetpoint", direction = "output" });
                            analog.Add(new { join = offset + 31, name = $"{roomName}_TempCurrent", direction = "input" });
                            serial.Add(new { join = offset + 10, name = $"{roomName}_HvacMode", direction = "input" });
                        }
                    }
                }
            }
        }

        var processor = "CP4";
        if (root.TryGetProperty("system", out var sys) && sys.TryGetProperty("processors", out var procs) && procs.GetArrayLength() > 0)
        {
            processor = procs[0].TryGetProperty("processor", out var pt) ? pt.GetString() ?? "CP4" : "CP4";
        }
        var projectId = root.TryGetProperty("projectId", out var pid) ? pid.GetString() ?? "" : "";

        var joinList = new
        {
            schemaVersion = "1.0",
            processor,
            projectId,
            debugMode = false,
            joins = new { digital, analog, serial },
        };

        return Results.Json(joinList);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to generate JoinList from SystemConfig.");
        return Results.Problem("Failed to generate JoinList.");
    }
    finally
    {
        fileLock.Release();
    }
});

// --- Network Scanner endpoints ---
app.MapPost("/api/network/scan", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var subnet = root.TryGetProperty("subnet", out var s) ? s.GetString() : null;

        if (string.IsNullOrWhiteSpace(subnet))
        {
            return Results.BadRequest(new { message = "subnet is required (e.g. 192.168.1.0/24)." });
        }

        var scanId = NetworkScanner.StartScan(subnet!, logger);
        return Results.Ok(new { scanId });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

app.MapGet("/api/network/scan/{id}", (string id) =>
{
    var scan = NetworkScanner.GetScan(id);
    if (scan == null)
    {
        return Results.NotFound(new { message = $"Scan '{id}' not found." });
    }
    return Results.Json(scan);
});

app.MapGet("/api/network/scans", () =>
{
    return Results.Json(NetworkScanner.ListScans());
});

app.MapDelete("/api/network/scan/{id}", (string id) =>
{
    if (NetworkScanner.CancelScan(id))
    {
        return Results.Ok(new { message = "Scan cancelled." });
    }
    return Results.NotFound(new { message = $"Scan '{id}' not found." });
});

// --- Debug / Simulation endpoints ---

app.MapGet("/api/debug/signals", async () =>
{
    if (!File.Exists(systemConfigPath))
    {
        return Results.NotFound(new { message = "SystemConfig not found." });
    }

    try
    {
        await fileLock.WaitAsync();
        string configJson;
        try { configJson = await File.ReadAllTextAsync(systemConfigPath); }
        finally { fileLock.Release(); }

        var signals = SimulationEngine.BuildSignals(configJson);
        return Results.Json(signals);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to build debug signals.");
        return Results.Problem("Unable to build signal list.");
    }
});

app.MapGet("/api/debug/connections", async () =>
{
    if (!File.Exists(systemConfigPath))
    {
        return Results.NotFound(new { message = "SystemConfig not found." });
    }

    try
    {
        await fileLock.WaitAsync();
        string configJson;
        try { configJson = await File.ReadAllTextAsync(systemConfigPath); }
        finally { fileLock.Release(); }

        var connections = SimulationEngine.BuildConnections(configJson);
        return Results.Json(connections);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to build debug connections.");
        return Results.Problem("Unable to build connection list.");
    }
});

app.MapGet("/api/debug/logs", (HttpRequest request) =>
{
    var levelFilter = request.Query["level"].FirstOrDefault();
    var sinceStr = request.Query["since"].FirstOrDefault();
    var limitStr = request.Query["limit"].FirstOrDefault();

    long sinceTs = 0;
    if (!string.IsNullOrEmpty(sinceStr) && long.TryParse(sinceStr, out var s)) sinceTs = s;
    int limit = 200;
    if (!string.IsNullOrEmpty(limitStr) && int.TryParse(limitStr, out var l)) limit = Math.Min(l, 1000);

    var entries = SimulationEngine.GetLogs(levelFilter, sinceTs, limit);
    return Results.Json(entries);
});

app.MapGet("/api/debug/joins", async () =>
{
    if (!File.Exists(systemConfigPath))
    {
        return Results.NotFound(new { message = "SystemConfig not found." });
    }

    try
    {
        await fileLock.WaitAsync();
        string configJson;
        try { configJson = await File.ReadAllTextAsync(systemConfigPath); }
        finally { fileLock.Release(); }

        var joins = SimulationEngine.BuildJoinValues(configJson);
        return Results.Json(joins);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to build join values.");
        return Results.Problem("Unable to build join values.");
    }
});

app.MapPost("/api/debug/joins/{type}/{join}", async (string type, int join, HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var value = root.TryGetProperty("value", out var v) ? v : default;

        SimulationEngine.SetJoinValue(type, join, value);
        SimulationEngine.LogAndBuffer("info", "api", $"Set {type}:{join} = {value}");
        return Results.Ok(new { message = "Value set." });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON." });
    }
});

app.MapPost("/api/debug/simulation/reset", () =>
{
    SimulationEngine.Reset();
    SimulationEngine.LogAndBuffer("info", "system", "Simulation reset");
    return Results.Ok(new { message = "Simulation reset." });
});

// --- Deployment endpoints ---
app.MapPost("/api/deploy/test-auth", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();
    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipP) ? ipP.GetString() : null;
        var port = root.TryGetProperty("port", out var portP) ? portP.GetInt32() : 22;
        var username = root.TryGetProperty("username", out var uP) ? uP.GetString() : null;
        var password = root.TryGetProperty("password", out var pP) ? pP.GetString() : null;

        if (string.IsNullOrWhiteSpace(ip)) return Results.BadRequest(new { message = "ip is required." });
        if (string.IsNullOrWhiteSpace(username)) return Results.BadRequest(new { message = "username is required." });
        if (string.IsNullOrWhiteSpace(password)) return Results.BadRequest(new { message = "password is required." });

        var result = await DeploymentManager.TestAuth(ip!, port, username!, password!);
        return Results.Json(result);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/deploy/preview", async () =>
{
    var result = await DeploymentManager.PreviewFiles(systemConfigPath, joinListPath, fileLock);
    if (result.error != null)
    {
        return Results.BadRequest(new { message = result.error });
    }
    return Results.Json(new { files = result.files });
});

app.MapPost("/api/deploy/execute", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();
    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipP) ? ipP.GetString() : null;
        var port = root.TryGetProperty("port", out var portP) ? portP.GetInt32() : 22;
        var username = root.TryGetProperty("username", out var uP) ? uP.GetString() : null;
        var password = root.TryGetProperty("password", out var pP) ? pP.GetString() : null;

        if (string.IsNullOrWhiteSpace(ip)) return Results.BadRequest(new { message = "ip is required." });
        if (string.IsNullOrWhiteSpace(username)) return Results.BadRequest(new { message = "username is required." });
        if (string.IsNullOrWhiteSpace(password)) return Results.BadRequest(new { message = "password is required." });

        var deployId = DeploymentManager.StartDeploy(ip!, port, username!, password!, systemConfigPath, joinListPath, fileLock, logger);
        if (deployId == null)
        {
            return Results.Conflict(new { message = "A deployment is already in progress." });
        }
        return Results.Ok(new { deployId });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapGet("/api/deploy/status/{id}", (string id) =>
{
    var status = DeploymentManager.GetStatus(id);
    if (status == null)
    {
        return Results.NotFound(new { message = $"Deployment '{id}' not found." });
    }
    return Results.Json(status);
});

app.MapDelete("/api/deploy/{id}", (string id) =>
{
    if (DeploymentManager.Cancel(id))
    {
        return Results.Ok(new { message = "Deployment cancelled." });
    }
    return Results.NotFound(new { message = $"Deployment '{id}' not found." });
});

app.MapPost("/api/deploy/verify/{id}", async (string id, HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();
    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipP) ? ipP.GetString() : null;
        var port = root.TryGetProperty("port", out var portP) ? portP.GetInt32() : 22;
        var username = root.TryGetProperty("username", out var uP) ? uP.GetString() : null;
        var password = root.TryGetProperty("password", out var pP) ? pP.GetString() : null;

        if (string.IsNullOrWhiteSpace(ip)) return Results.BadRequest(new { message = "ip is required." });
        if (string.IsNullOrWhiteSpace(username)) return Results.BadRequest(new { message = "username is required." });
        if (string.IsNullOrWhiteSpace(password)) return Results.BadRequest(new { message = "password is required." });

        var result = await DeploymentManager.Verify(id, ip!, port, username!, password!);
        if (result == null)
        {
            return Results.NotFound(new { message = $"Deployment '{id}' not found." });
        }
        return Results.Json(result);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/deploy/restart-program", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();
    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipP) ? ipP.GetString() : null;
        var username = root.TryGetProperty("username", out var uP) ? uP.GetString() : null;
        var password = root.TryGetProperty("password", out var pP) ? pP.GetString() : null;

        if (string.IsNullOrWhiteSpace(ip)) return Results.BadRequest(new { message = "ip is required." });
        if (string.IsNullOrWhiteSpace(username)) return Results.BadRequest(new { message = "username is required." });
        if (string.IsNullOrWhiteSpace(password)) return Results.BadRequest(new { message = "password is required." });

        var result = await DeploymentManager.RestartProgram(ip!, username!, password!, logger);
        return Results.Json(result);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/deploy/ssh-command", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();
    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipP) ? ipP.GetString() : null;
        var port = root.TryGetProperty("port", out var portP) ? portP.GetInt32() : 22;
        var username = root.TryGetProperty("username", out var uP) ? uP.GetString() : null;
        var password = root.TryGetProperty("password", out var pP) ? pP.GetString() : null;
        var command = root.TryGetProperty("command", out var cP) ? cP.GetString() : null;

        if (string.IsNullOrWhiteSpace(ip)) return Results.BadRequest(new { message = "ip is required." });
        if (string.IsNullOrWhiteSpace(username)) return Results.BadRequest(new { message = "username is required." });
        if (string.IsNullOrWhiteSpace(password)) return Results.BadRequest(new { message = "password is required." });
        if (string.IsNullOrWhiteSpace(command)) return Results.BadRequest(new { message = "command is required." });

        var result = await DeploymentManager.ExecuteSshCommand(ip!, port, username!, password!, command!, logger);
        return Results.Json(result);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/deploy/clone-program-slot", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    string body = await reader.ReadToEndAsync();
    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var sourceIp = root.TryGetProperty("sourceIp", out var srcIpP) ? srcIpP.GetString() : null;
        var sourcePort = root.TryGetProperty("sourcePort", out var srcPortP) ? srcPortP.GetInt32() : 22;
        var sourceUsername = root.TryGetProperty("sourceUsername", out var srcUserP) ? srcUserP.GetString() : null;
        var sourcePassword = root.TryGetProperty("sourcePassword", out var srcPassP) ? srcPassP.GetString() : null;

        var targetIp = root.TryGetProperty("targetIp", out var dstIpP) ? dstIpP.GetString() : null;
        var targetPort = root.TryGetProperty("targetPort", out var dstPortP) ? dstPortP.GetInt32() : 22;
        var targetUsername = root.TryGetProperty("targetUsername", out var dstUserP) ? dstUserP.GetString() : null;
        var targetPassword = root.TryGetProperty("targetPassword", out var dstPassP) ? dstPassP.GetString() : null;

        var sourceSlot = root.TryGetProperty("sourceSlot", out var srcSlotP) && srcSlotP.TryGetInt32(out var sSlot) ? sSlot : 1;
        var targetSlot = root.TryGetProperty("targetSlot", out var dstSlotP) && dstSlotP.TryGetInt32(out var tSlot) ? tSlot : 1;

        if (string.IsNullOrWhiteSpace(sourceIp)) return Results.BadRequest(new { message = "sourceIp is required." });
        if (string.IsNullOrWhiteSpace(sourceUsername)) return Results.BadRequest(new { message = "sourceUsername is required." });
        if (string.IsNullOrWhiteSpace(sourcePassword)) return Results.BadRequest(new { message = "sourcePassword is required." });
        if (string.IsNullOrWhiteSpace(targetIp)) return Results.BadRequest(new { message = "targetIp is required." });
        if (string.IsNullOrWhiteSpace(targetUsername)) return Results.BadRequest(new { message = "targetUsername is required." });
        if (string.IsNullOrWhiteSpace(targetPassword)) return Results.BadRequest(new { message = "targetPassword is required." });
        if (sourceSlot < 1 || sourceSlot > 10) return Results.BadRequest(new { message = "sourceSlot must be between 1 and 10." });
        if (targetSlot < 1 || targetSlot > 10) return Results.BadRequest(new { message = "targetSlot must be between 1 and 10." });

        var result = await DeploymentManager.CloneProgramSlot(
            sourceIp!, sourcePort, sourceUsername!, sourcePassword!, sourceSlot,
            targetIp!, targetPort, targetUsername!, targetPassword!, targetSlot,
            logger);

        return Results.Json(result);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

// --- Mock Media Control endpoints (Apple TV + Sonos) ---
app.MapPost("/api/media/appletv/require-pin", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    string ip = "192.168.23.165";
    if (!string.IsNullOrWhiteSpace(body))
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            if (root.TryGetProperty("ip", out var ipEl))
            {
                ip = ipEl.GetString() ?? ip;
            }
        }
        catch (JsonException)
        {
            return Results.BadRequest(new { message = "Invalid JSON format." });
        }
    }

    if (useRealAppleTv)
    {
        var real = await RealAppleTvBridge.RequirePin(ip);
        if (!real.ok)
            return Results.BadRequest(new { message = real.message, real = true, details = real.details });

        return Results.Ok(new
        {
            ok = true,
            real = true,
            message = real.message,
            details = real.details,
        });
    }

    var state = MockMediaBridge.RequireAppleTvPin(ip);
    return Results.Ok(new
    {
        ok = true,
        mock = true,
        message = "PIN prompt requested (mock). Use appleTv.mockPin from this response.",
        appleTv = state,
    });
});

app.MapPost("/api/media/appletv/pair", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var pin = root.TryGetProperty("pin", out var pinEl) ? (pinEl.GetString() ?? string.Empty) : string.Empty;
        var ip = root.TryGetProperty("ip", out var ipEl) ? (ipEl.GetString() ?? "192.168.23.165") : "192.168.23.165";

        if (string.IsNullOrWhiteSpace(pin))
            return Results.BadRequest(new { message = "pin is required." });

        if (pin.Length != 4 || !pin.All(char.IsDigit))
            return Results.BadRequest(new { message = "pin must be a 4-digit code." });

        if (useRealAppleTv)
        {
            var pair = await RealAppleTvBridge.Pair(ip, pin);
            if (!pair.ok)
                return Results.BadRequest(new { message = pair.message, real = true, details = pair.details });

            return Results.Ok(new
            {
                ok = true,
                real = true,
                message = pair.message,
                details = pair.details,
            });
        }

        var pairedOk = MockMediaBridge.TryPairAppleTv(ip, pin, out var paired, out var pairError);
        if (!pairedOk)
            return Results.BadRequest(new { message = pairError ?? "Invalid pairing code.", appleTv = paired, mock = true });

        return Results.Ok(new
        {
            ok = true,
            mock = true,
            message = "Apple TV paired (mock).",
            appleTv = paired,
        });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/media/appletv/command", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var command = root.TryGetProperty("command", out var cmdEl) ? (cmdEl.GetString() ?? string.Empty) : string.Empty;
        var room = root.TryGetProperty("room", out var roomEl) ? (roomEl.GetString() ?? "Bedroom") : "Bedroom";

        if (string.IsNullOrWhiteSpace(command))
            return Results.BadRequest(new { message = "command is required." });

        if (useRealAppleTv)
        {
            var ip = root.TryGetProperty("ip", out var ipEl) ? (ipEl.GetString() ?? "192.168.23.165") : "192.168.23.165";
            var sent = await RealAppleTvBridge.SendCommand(ip, command);
            if (!sent.ok)
                return Results.BadRequest(new { message = sent.message, real = true, details = sent.details });

            return Results.Ok(new
            {
                ok = true,
                real = true,
                message = sent.message,
                result = sent.details,
            });
        }

        if (!MockMediaBridge.IsAppleTvPaired())
            return Results.Conflict(new { message = "Apple TV is not paired. Call /api/media/appletv/require-pin then /api/media/appletv/pair first." });

        var result = MockMediaBridge.SendAppleTvCommand(room, command);
        return Results.Ok(new
        {
            ok = true,
            mock = true,
            message = "Apple TV command applied (mock).",
            result,
        });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/media/sonos/bedroom/command", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var command = root.TryGetProperty("command", out var cmdEl) ? (cmdEl.GetString() ?? string.Empty) : string.Empty;
        var source = root.TryGetProperty("source", out var srcEl) ? srcEl.GetString() : null;
        var ip = root.TryGetProperty("ip", out var ipEl) ? (ipEl.GetString() ?? "192.168.23.105") : "192.168.23.105";
        var room = root.TryGetProperty("room", out var roomEl) ? (roomEl.GetString() ?? "Bedroom") : "Bedroom";
        int? volume = null;
        if (root.TryGetProperty("volume", out var volEl) && volEl.TryGetInt32(out var v)) volume = v;

        if (string.IsNullOrWhiteSpace(command))
            return Results.BadRequest(new { message = "command is required." });

        if (useRealSonos)
        {
            var sent = await RealSonosBridge.SendCommand(ip, command, source, volume);
            if (!sent.ok)
                return Results.BadRequest(new { message = sent.message, real = true, details = sent.details });

            return Results.Ok(new
            {
                ok = true,
                real = true,
                room,
                message = sent.message,
                sonos = sent.details,
            });
        }

        var state = MockMediaBridge.SendBedroomSonosCommand(command, source, volume);
        return Results.Ok(new
        {
            ok = true,
            mock = true,
            message = "Bedroom Sonos command applied (mock).",
            sonos = state,
        });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapGet("/api/media/sonos/topology", async (HttpRequest request) =>
{
    var ip = request.Query.TryGetValue("ip", out var value) ? (value.ToString() ?? "") : "";
    if (string.IsNullOrWhiteSpace(ip))
        return Results.BadRequest(new { message = "ip query param is required." });

    if (!useRealSonos)
        return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

    var topo = await RealSonosBridge.GetTopology(ip);
    if (!topo.ok)
        return Results.BadRequest(new { message = topo.message, real = true, details = topo.details });

    return Results.Ok(new { ok = true, real = true, message = topo.message, topology = topo.details });
});

app.MapPost("/api/media/sonos/group", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var coordinatorIp = root.TryGetProperty("coordinatorIp", out var cIpEl) ? (cIpEl.GetString() ?? "") : "";
        var memberIps = new List<string>();
        if (root.TryGetProperty("memberIps", out var membersEl) && membersEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var m in membersEl.EnumerateArray())
            {
                var v = m.GetString();
                if (!string.IsNullOrWhiteSpace(v)) memberIps.Add(v.Trim());
            }
        }

        if (!useRealSonos)
            return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

        var grouped = await RealSonosBridge.GroupRooms(coordinatorIp, memberIps);
        if (!grouped.ok)
            return Results.BadRequest(new { message = grouped.message, real = true, details = grouped.details });

        return Results.Ok(new { ok = true, real = true, message = grouped.message, details = grouped.details });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/media/sonos/ungroup", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipEl) ? (ipEl.GetString() ?? "") : "";

        if (!useRealSonos)
            return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

        var ungrouped = await RealSonosBridge.Ungroup(ip);
        if (!ungrouped.ok)
            return Results.BadRequest(new { message = ungrouped.message, real = true, details = ungrouped.details });

        return Results.Ok(new { ok = true, real = true, message = ungrouped.message, details = ungrouped.details });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapGet("/api/media/sonos/now-playing", async (HttpRequest request) =>
{
    var ip = request.Query.TryGetValue("ip", out var ipEl) ? (ipEl.ToString() ?? "") : "";

    if (!useRealSonos)
        return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

    var nowPlaying = await RealSonosBridge.GetNowPlaying(ip);
    if (!nowPlaying.ok)
        return Results.BadRequest(new { message = nowPlaying.message, real = true, details = nowPlaying.details });

    return Results.Ok(new { ok = true, real = true, message = nowPlaying.message, details = nowPlaying.details });
});

app.MapPost("/api/media/sonos/volume", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipEl) ? (ipEl.GetString() ?? "") : "";

        if (!root.TryGetProperty("volume", out var volumeEl) || !volumeEl.TryGetInt32(out var volume))
            return Results.BadRequest(new { message = "volume is required." });

        if (!useRealSonos)
            return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

        var changed = await RealSonosBridge.SetVolumeAbsolute(ip, volume);
        if (!changed.ok)
            return Results.BadRequest(new { message = changed.message, real = true, details = changed.details });

        return Results.Ok(new { ok = true, real = true, message = changed.message, details = changed.details });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/media/sonos/mute", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipEl) ? (ipEl.GetString() ?? "") : "";

        if (!root.TryGetProperty("muted", out var mutedEl) ||
            (mutedEl.ValueKind != JsonValueKind.True && mutedEl.ValueKind != JsonValueKind.False))
            return Results.BadRequest(new { message = "muted is required." });

        var muted = mutedEl.GetBoolean();

        if (!useRealSonos)
            return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

        var changed = await RealSonosBridge.SetMute(ip, muted);
        if (!changed.ok)
            return Results.BadRequest(new { message = changed.message, real = true, details = changed.details });

        return Results.Ok(new { ok = true, real = true, message = changed.message, details = changed.details });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapGet("/api/media/sonos/queue", async (HttpRequest request) =>
{
    var ip = request.Query.TryGetValue("ip", out var ipEl) ? (ipEl.ToString() ?? "") : "";
    var start = request.Query.TryGetValue("start", out var startEl) && int.TryParse(startEl, out var s) ? s : 0;
    var count = request.Query.TryGetValue("count", out var countEl) && int.TryParse(countEl, out var c) ? c : 50;

    if (!useRealSonos)
        return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

    var queue = await RealSonosBridge.BrowseQueue(ip, start, count);
    if (!queue.ok)
        return Results.BadRequest(new { message = queue.message, real = true, details = queue.details });

    return Results.Ok(new { ok = true, real = true, message = queue.message, details = queue.details });
});

app.MapGet("/api/media/sonos/playlists", async (HttpRequest request) =>
{
    var ip = request.Query.TryGetValue("ip", out var ipEl) ? (ipEl.ToString() ?? "") : "";
    var start = request.Query.TryGetValue("start", out var startEl) && int.TryParse(startEl, out var s) ? s : 0;
    var count = request.Query.TryGetValue("count", out var countEl) && int.TryParse(countEl, out var c) ? c : 100;

    if (!useRealSonos)
        return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

    var playlists = await RealSonosBridge.BrowsePlaylists(ip, start, count);
    if (!playlists.ok)
        return Results.BadRequest(new { message = playlists.message, real = true, details = playlists.details });

    return Results.Ok(new { ok = true, real = true, message = playlists.message, details = playlists.details });
});

app.MapGet("/api/media/sonos/favorites", async (HttpRequest request) =>
{
    var ip = request.Query.TryGetValue("ip", out var ipEl) ? (ipEl.ToString() ?? "") : "";
    var start = request.Query.TryGetValue("start", out var startEl) && int.TryParse(startEl, out var s) ? s : 0;
    var count = request.Query.TryGetValue("count", out var countEl) && int.TryParse(countEl, out var c) ? c : 100;

    if (!useRealSonos)
        return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

    var favorites = await RealSonosBridge.BrowseFavorites(ip, start, count);
    if (!favorites.ok)
        return Results.BadRequest(new { message = favorites.message, real = true, details = favorites.details });

    return Results.Ok(new { ok = true, real = true, message = favorites.message, details = favorites.details });
});

app.MapGet("/api/media/sonos/search", async (HttpRequest request) =>
{
    var ip = request.Query.TryGetValue("ip", out var ipEl) ? (ipEl.ToString() ?? "") : "";
    var term = request.Query.TryGetValue("term", out var termEl) ? (termEl.ToString() ?? "") : "";
    var start = request.Query.TryGetValue("start", out var startEl) && int.TryParse(startEl, out var s) ? s : 0;
    var count = request.Query.TryGetValue("count", out var countEl) && int.TryParse(countEl, out var c) ? c : 50;
    var containerId = request.Query.TryGetValue("containerId", out var containerEl) ? (containerEl.ToString() ?? "A:TRACKS") : "A:TRACKS";

    if (!useRealSonos)
        return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

    if (string.IsNullOrWhiteSpace(term))
        return Results.BadRequest(new { message = "term is required." });

    var search = await RealSonosBridge.Search(ip, term, start, count, containerId);
    if (!search.ok)
        return Results.BadRequest(new { message = search.message, real = true, details = search.details });

    return Results.Ok(new { ok = true, real = true, message = search.message, details = search.details });
});

app.MapPost("/api/media/sonos/play-favorite", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipEl) ? (ipEl.GetString() ?? "") : "";
        var title = root.TryGetProperty("title", out var titleEl) ? (titleEl.GetString() ?? "") : "";

        if (!useRealSonos)
            return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

        var play = await RealSonosBridge.PlayFavorite(ip, title);
        if (!play.ok)
            return Results.BadRequest(new { message = play.message, real = true, details = play.details });

        return Results.Ok(new { ok = true, real = true, message = play.message, details = play.details });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapPost("/api/media/sonos/play-playlist", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var ip = root.TryGetProperty("ip", out var ipEl) ? (ipEl.GetString() ?? "") : "";
        var title = root.TryGetProperty("title", out var titleEl) ? (titleEl.GetString() ?? "") : "";

        if (!useRealSonos)
            return Results.BadRequest(new { message = "Real Sonos mode is disabled." });

        var play = await RealSonosBridge.PlayPlaylist(ip, title);
        if (!play.ok)
            return Results.BadRequest(new { message = play.message, real = true, details = play.details });

        return Results.Ok(new { ok = true, real = true, message = play.message, details = play.details });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.MapGet("/api/media/mock/state", () =>
{
    return Results.Ok(MockMediaBridge.GetState());
});

app.MapPost("/api/media/feedback/ping", () =>
{
    return Results.Ok(new
    {
        ok = true,
        acceptedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        mock = true,
    });
});

app.MapPost("/api/media/feedback", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    if (string.IsNullOrWhiteSpace(body))
        return Results.BadRequest(new { message = "Feedback payload is required." });

    try
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var source = root.TryGetProperty("source", out var srcEl) ? (srcEl.GetString() ?? "ui") : "ui";
        var type = root.TryGetProperty("type", out var typeEl) ? (typeEl.GetString() ?? "info") : "info";
        var message = root.TryGetProperty("message", out var msgEl) ? (msgEl.GetString() ?? "") : "";

        var accepted = MockMediaBridge.AcceptFeedback(source, type, message, root.Clone());
        return Results.Ok(new
        {
            ok = true,
            mock = true,
            accepted,
        });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { message = "Invalid JSON format." });
    }
});

app.Run();

static bool TryValidateJoinList(string json, out string error)
{
    return ConfigJsonValidator.TryValidateJoinList(json, out error);
}

static string Slugify(string name)
{
    var sb = new StringBuilder();
    foreach (var c in name.ToLowerInvariant())
    {
        if (char.IsLetterOrDigit(c)) sb.Append(c);
        else if (c == ' ' || c == '-' || c == '_') sb.Append('-');
    }
    // collapse consecutive dashes and trim
    var result = sb.ToString();
    while (result.Contains("--")) result = result.Replace("--", "-");
    return result.Trim('-');
}

static void CopyDirectoryFiltered(string sourceDir, string destinationDir, string[] excludedFolderNames)
{
    Directory.CreateDirectory(destinationDir);

    foreach (var file in Directory.GetFiles(sourceDir, "*", SearchOption.TopDirectoryOnly))
    {
        var fileName = Path.GetFileName(file);
        var destinationFile = Path.Combine(destinationDir, fileName);
        File.Copy(file, destinationFile, overwrite: true);
    }

    foreach (var subDir in Directory.GetDirectories(sourceDir, "*", SearchOption.TopDirectoryOnly))
    {
        var folderName = Path.GetFileName(subDir);
        if (excludedFolderNames.Any(ex => string.Equals(ex, folderName, StringComparison.OrdinalIgnoreCase)))
            continue;

        var destinationSubDir = Path.Combine(destinationDir, folderName);
        CopyDirectoryFiltered(subDir, destinationSubDir, excludedFolderNames);
    }
}

static async Task<(bool ok, int exitCode, string stdout, string stderr)> ExecuteShellCommand(string command, string workingDirectory)
{
    var isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
    var fileName = isWindows ? "cmd.exe" : "/bin/bash";
    var arguments = isWindows ? $"/c {command}" : $"-lc \"{command}\"";

    var psi = new ProcessStartInfo
    {
        FileName = fileName,
        Arguments = arguments,
        WorkingDirectory = workingDirectory,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        UseShellExecute = false,
        CreateNoWindow = true,
    };

    using var process = Process.Start(psi);
    if (process == null)
        return (false, -1, string.Empty, "Unable to start process.");

    var stdoutTask = process.StandardOutput.ReadToEndAsync();
    var stderrTask = process.StandardError.ReadToEndAsync();
    await process.WaitForExitAsync();

    var stdout = await stdoutTask;
    var stderr = await stderrTask;

    return (process.ExitCode == 0, process.ExitCode, stdout.Trim(), stderr.Trim());
}

static void ResetDirectoryContents(string rootPath)
{
    Directory.CreateDirectory(rootPath);

    foreach (var file in Directory.GetFiles(rootPath, "*", SearchOption.TopDirectoryOnly))
    {
        DeleteFileWithRetry(file, 4);
    }

    foreach (var directory in Directory.GetDirectories(rootPath, "*", SearchOption.TopDirectoryOnly))
    {
        DeleteDirectoryWithRetry(directory, 4);
    }
}

static void DeleteFileWithRetry(string path, int attempts)
{
    for (var i = 0; i < attempts; i++)
    {
        try
        {
            if (File.Exists(path))
            {
                File.SetAttributes(path, FileAttributes.Normal);
                File.Delete(path);
            }
            return;
        }
        catch (IOException)
        {
            if (i == attempts - 1) throw;
            Thread.Sleep(120 * (i + 1));
        }
        catch (UnauthorizedAccessException)
        {
            if (i == attempts - 1) throw;
            Thread.Sleep(120 * (i + 1));
        }
    }
}

static void DeleteDirectoryWithRetry(string path, int attempts)
{
    for (var i = 0; i < attempts; i++)
    {
        try
        {
            if (Directory.Exists(path))
            {
                foreach (var file in Directory.GetFiles(path, "*", SearchOption.AllDirectories))
                {
                    File.SetAttributes(file, FileAttributes.Normal);
                }

                Directory.Delete(path, recursive: true);
            }
            return;
        }
        catch (IOException)
        {
            if (i == attempts - 1) throw;
            Thread.Sleep(150 * (i + 1));
        }
        catch (UnauthorizedAccessException)
        {
            if (i == attempts - 1) throw;
            Thread.Sleep(150 * (i + 1));
        }
    }
}

static IResult ServeXpanelLiveFile(string distRoot, string? requestedPath)
{
    if (!Directory.Exists(distRoot))
    {
        return Results.NotFound(new
        {
            message = "XPanel dist output not found. Run prepare-package with runBuild=true first.",
            distRoot,
        });
    }

    var safePath = string.IsNullOrWhiteSpace(requestedPath) ? "index.html" : requestedPath.Replace('/', Path.DirectorySeparatorChar);
    var fullPath = Path.GetFullPath(Path.Combine(distRoot, safePath));
    var normalizedRoot = Path.GetFullPath(distRoot) + Path.DirectorySeparatorChar;

    if (!fullPath.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest(new { message = "Invalid path." });
    }

    if (!File.Exists(fullPath))
    {
        if (!Path.HasExtension(safePath))
        {
            var fallbackIndex = Path.Combine(distRoot, "index.html");
            if (File.Exists(fallbackIndex))
            {
                return Results.File(fallbackIndex, "text/html");
            }
        }

        return Results.NotFound(new { message = "Requested live asset not found." });
    }

    var provider = new FileExtensionContentTypeProvider();
    if (!provider.TryGetContentType(fullPath, out var contentType))
    {
        contentType = "application/octet-stream";
    }

    return Results.File(fullPath, contentType);
}

static void EnsureSftpDirectory(SftpClient sftp, string remotePath)
{
    if (string.IsNullOrWhiteSpace(remotePath)) return;

    var normalized = remotePath.Replace("\\", "/");
    if (!normalized.StartsWith('/')) normalized = "/" + normalized;

    var parts = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
    var current = "";

    foreach (var part in parts)
    {
        current += "/" + part;
        if (!sftp.Exists(current))
        {
            sftp.CreateDirectory(current);
        }
    }
}

static void SearchRemoteByName(SftpClient sftp, string path, string findName, int depth, List<string> matches)
{
    if (depth < 0) return;

    IEnumerable<Renci.SshNet.Sftp.ISftpFile> entries;
    try
    {
        entries = sftp.ListDirectory(path);
    }
    catch
    {
        return;
    }

    foreach (var entry in entries)
    {
        if (entry.Name == "." || entry.Name == "..") continue;

        if (entry.Name.Contains(findName, StringComparison.OrdinalIgnoreCase))
        {
            matches.Add(entry.FullName);
        }

        if (entry.IsDirectory)
        {
            SearchRemoteByName(sftp, entry.FullName, findName, depth - 1, matches);
        }
    }
}

static bool TryValidateSystemConfig(string json, out string error)
{
    return ConfigJsonValidator.TryValidateSystemConfig(json, out error);
}

static string? FindDeviceFile(string devicesPath, string id)
{
    if (!Directory.Exists(devicesPath)) return null;
    var files = Directory.GetFiles(devicesPath, "*.json", SearchOption.AllDirectories);
    foreach (var file in files)
    {
        try
        {
            var json = File.ReadAllText(file);
            var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("id", out var idProp)
                && string.Equals(idProp.GetString(), id, StringComparison.OrdinalIgnoreCase))
            {
                return file;
            }
        }
        catch { /* skip unparseable files */ }
    }
    return null;
}

public partial class Program { }

/// <summary>
/// Server-side join contract builder that replicates JoinMap.cs constants
/// and JoinContractExporter.cs logic for the API layer.
/// </summary>
static class JoinContractBuilder
{
    const int JoinsPerRoom = 100;
    const int SystemOffset = 900;

    // Digital offsets per room
    static readonly (int offset, string name, string direction)[] RoomDigital =
    [
        (0, "Power Toggle", "input"),
        (1, "Power Feedback", "output"),
        (2, "Source Select 1", "input"), (3, "Source Select 2", "input"),
        (4, "Source Select 3", "input"), (5, "Source Select 4", "input"), (6, "Source Select 5", "input"),
        (7, "Source Feedback 1", "output"), (8, "Source Feedback 2", "output"),
        (9, "Source Feedback 3", "output"), (10, "Source Feedback 4", "output"), (11, "Source Feedback 5", "output"),
        (12, "Volume Up", "input"), (13, "Volume Down", "input"),
        (14, "Mute Toggle", "input"), (15, "Mute Feedback", "output"),
        (20, "Lighting Scene 1", "input"), (21, "Lighting Scene 2", "input"),
        (22, "Lighting Scene 3", "input"), (23, "Lighting Scene 4", "input"),
        (24, "Lighting Scene FB 1", "output"), (25, "Lighting Scene FB 2", "output"),
        (26, "Lighting Scene FB 3", "output"), (27, "Lighting Scene FB 4", "output"),
        (30, "Shade Open", "input"), (31, "Shade Close", "input"), (32, "Shade Stop", "input"),
        (40, "HVAC Mode Toggle", "input"), (41, "HVAC On/Off", "input"),
        (50, "Security Arm Away", "input"), (51, "Security Arm Stay", "input"),
        (52, "Security Arm Night", "input"), (53, "Security Disarm", "input"),
        (54, "Security Panic", "input"), (55, "Security Status Request", "input"),
        (56, "Security Armed Away FB", "output"), (57, "Security Armed Stay FB", "output"),
        (58, "Security Armed Night FB", "output"), (59, "Security Disarmed FB", "output"),
        (60, "Security Alarm Active FB", "output"), (61, "Security Trouble FB", "output"),
        (62, "Security Ready FB", "output"),
        (63, "Security Zone 1 FB", "output"), (64, "Security Zone 2 FB", "output"),
        (65, "Security Zone 3 FB", "output"), (66, "Security Zone 4 FB", "output"),
        (67, "Security Zone 5 FB", "output"), (68, "Security Zone 6 FB", "output"),
        (69, "Security Zone 7 FB", "output"), (70, "Security Zone 8 FB", "output"),
    ];

    static readonly (int offset, string name, string direction)[] RoomAnalog =
    [
        (0, "Volume Level FB", "output"), (1, "Volume Set", "input"),
        (2, "Lighting Level FB", "output"), (3, "Lighting Set", "input"),
        (4, "Shade Position FB", "output"), (5, "Shade Set", "input"),
        (6, "Temp Current", "output"), (7, "Temp Setpoint Set", "input"), (8, "Temp Setpoint FB", "output"),
    ];

    static readonly (int offset, string name, string direction)[] RoomSerial =
    [
        (0, "Source Name", "output"), (1, "Room Name", "output"),
        (2, "Scene Name", "output"), (3, "HVAC Mode", "output"),
        (4, "Status Text", "output"), (5, "Security Arm Mode", "output"),
        (6, "Security Status", "output"), (7, "Security Disarm Code", "input"),
    ];

    static ushort Resolve(int roomOffset, int joinOffset) => (ushort)(roomOffset + joinOffset + 1);
    static ushort ResolveSystem(int joinOffset) => (ushort)(SystemOffset + joinOffset);

    public static object Build(string systemConfigJson)
    {
        using var doc = JsonDocument.Parse(systemConfigJson);
        var root = doc.RootElement;

        // Check for multi-processor config
        var hasProcessors = root.TryGetProperty("system", out var systemEl)
            && systemEl.TryGetProperty("processors", out var processorsEl)
            && processorsEl.ValueKind == JsonValueKind.Array
            && processorsEl.GetArrayLength() > 0;

        var rooms = new List<object>();
        if (root.TryGetProperty("rooms", out var roomsEl))
        {
            foreach (var room in roomsEl.EnumerateArray())
            {
                var id = room.GetProperty("id").GetString()!;
                var name = room.GetProperty("name").GetString()!;
                var offset = room.GetProperty("joinOffset").GetInt32();
                var processorId = room.TryGetProperty("processorId", out var procProp) ? procProp.GetString() : null;

                var roomObj = new Dictionary<string, object>
                {
                    ["id"] = id,
                    ["name"] = name,
                    ["joins"] = new
                    {
                        digital = RoomDigital.Select(j => new { join = (int)Resolve(offset, j.offset), name = j.name, direction = j.direction }).ToArray(),
                        analog = RoomAnalog.Select(j => new { join = (int)Resolve(offset, j.offset), name = j.name, direction = j.direction }).ToArray(),
                        serial = RoomSerial.Select(j => new { join = (int)Resolve(offset, j.offset), name = j.name, direction = j.direction }).ToArray(),
                    }
                };

                if (processorId != null)
                {
                    roomObj["processorId"] = processorId;
                }

                rooms.Add(roomObj);
            }
        }

        // System joins
        var systemDigital = new List<object>();
        systemDigital.Add(new { join = (int)ResolveSystem(0), name = "All Off", direction = "input" });
        for (int i = 0; i < 10; i++)
        {
            systemDigital.Add(new { join = (int)ResolveSystem(1 + i), name = $"Scene Trigger {i + 1}", direction = "input" });
            systemDigital.Add(new { join = (int)ResolveSystem(11 + i), name = $"Scene Feedback {i + 1}", direction = "output" });
        }

        var systemSerial = new List<object>
        {
            new { join = (int)ResolveSystem(0), name = "System Status", direction = "output" },
            new { join = (int)ResolveSystem(1), name = "Active Scene Name", direction = "output" },
        };

        // Build result
        var result = new Dictionary<string, object>
        {
            ["version"] = "1.0",
            ["generatedAt"] = DateTime.UtcNow.ToString("o"),
            ["system"] = new
            {
                digital = systemDigital,
                serial = systemSerial,
            }
        };

        if (hasProcessors)
        {
            // Group rooms by processor
            var processorGroups = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase);
            foreach (var room in rooms)
            {
                var dict = (Dictionary<string, object>)room;
                var procId = dict.ContainsKey("processorId") ? dict["processorId"].ToString()! : "main";
                if (!processorGroups.ContainsKey(procId))
                    processorGroups[procId] = new List<object>();
                processorGroups[procId].Add(room);
            }
            result["processors"] = processorGroups;
            result["rooms"] = rooms; // Also include flat list for backward compat
        }
        else
        {
            result["rooms"] = rooms;
        }

        return result;
    }
}

/// <summary>
/// Network scanner that discovers devices on a subnet via ping + TCP port probing.
/// No external NuGet dependencies — uses System.Net only.
/// </summary>
static class NetworkScanner
{
    // Win32 IP Helper API — direct ARP resolution without spawning processes
    [DllImport("iphlpapi.dll", ExactSpelling = true)]
    static extern int SendARP(uint DestIP, uint SrcIP, byte[] pMacAddr, ref int PhyAddrLen);

    static readonly ConcurrentDictionary<string, ScanState> _scans = new();
    static int _activeScanCount;

    static readonly int[] ProbePorts = [41794, 80, 443, 8080, 22, 23, 4998, 502, 47808, 7000, 7001];

    static readonly Dictionary<int, string> PortLabels = new()
    {
        [41794] = "CIP", [80] = "HTTP", [443] = "HTTPS", [8080] = "HTTP-Alt",
        [22] = "SSH", [23] = "Telnet", [4998] = "PJLink", [502] = "Modbus", [47808] = "BACnet",
        [7000] = "AirPlay", [7001] = "RAOP",
    };

    static readonly string[] MdnsServiceMarkers =
    [
        "_airplay._tcp.local",
        "_raop._tcp.local",
        "_companion-link._tcp.local",
        "_mediaremotetv._tcp.local",
        "_sleep-proxy._udp.local",
        "_homekit._tcp.local",
        "_device-info._tcp.local",
        "_srpl-tls._tcp.local",
        "_trel._udp.local",
    ];

    /// <summary>
    /// Resolve MAC via Win32 SendARP — sends a real ARP request, doesn't depend on OS cache.
    /// Works reliably for any reachable LAN host, unlike parsing `arp -a` output.
    /// </summary>
    static string ResolveArp(IPAddress ip)
    {
        try
        {
            var ipBytes = ip.GetAddressBytes();
            uint destIp = BitConverter.ToUInt32(ipBytes, 0);
            var macAddr = new byte[6];
            int macLen = macAddr.Length;
            if (SendARP(destIp, 0, macAddr, ref macLen) != 0) return "";
            var mac = string.Join(":", macAddr.Select(b => b.ToString("X2")));
            if (mac == "00:00:00:00:00:00" || mac.StartsWith("FF:FF:FF")) return "";
            return mac;
        }
        catch { return ""; }
    }

    public static string StartScan(string subnet, ILogger logger)
    {
        if (Interlocked.CompareExchange(ref _activeScanCount, 0, 0) >= 3)
        {
            throw new ArgumentException("Maximum 3 concurrent scans. Cancel an existing scan first.");
        }

        var hosts = ParseCidr(subnet);
        if (hosts.Count == 0)
        {
            throw new ArgumentException($"No valid hosts in range '{subnet}'.");
        }
        if (hosts.Count > 1024)
        {
            throw new ArgumentException($"Range too large ({hosts.Count} hosts). Maximum 1024.");
        }

        var scanId = Guid.NewGuid().ToString("N")[..12];
        var state = new ScanState
        {
            Id = scanId,
            Status = "running",
            StartedAt = DateTime.UtcNow,
            TotalHosts = hosts.Count,
        };
        _scans[scanId] = state;
        Interlocked.Increment(ref _activeScanCount);

        _ = Task.Run(async () =>
        {
            try
            {
                // Launch SSDP/UPnP + mDNS discovery in parallel with host scanning
                var ssdpTask = DiscoverSsdpAsync(state.Cts.Token);
                var mdnsTask = DiscoverMdnsAsync(state.Cts.Token);

                var semaphore = new SemaphoreSlim(30);
                var tasks = hosts.Select(async ip =>
                {
                    await semaphore.WaitAsync(state.Cts.Token);
                    try
                    {
                        if (state.Cts.IsCancellationRequested) return;
                        var result = await ScanHostAsync(ip, state.Cts.Token);
                        if (result != null)
                        {
                            state.Results.TryAdd(ip.ToString(), result);
                        }
                    }
                    finally
                    {
                        semaphore.Release();
                        Interlocked.Increment(ref state.ScannedHosts);
                    }
                });

                await Task.WhenAll(tasks);

                // ── Enrichment phase ──
                if (!state.Cts.IsCancellationRequested)
                {
                    // Batch ARP fallback for any hosts where SendARP missed
                    var arpTable = BuildArpTable();

                    // Collect SSDP/UPnP discovery results
                    Dictionary<string, SsdpDevice> ssdpDevices;
                    Dictionary<string, MdnsDevice> mdnsDevices;
                    try { ssdpDevices = await ssdpTask; }
                    catch { ssdpDevices = new(); }
                    try { mdnsDevices = await mdnsTask; }
                    catch { mdnsDevices = new(); }

                    // Merge mDNS-only devices (not discovered by ping/port probe)
                    foreach (var mkvp in mdnsDevices)
                    {
                        if (state.Results.ContainsKey(mkvp.Key)) continue;

                        var md = mkvp.Value;
                        var hasAirplay = md.Services.Contains("_airplay._tcp.local") || md.Services.Contains("_raop._tcp.local");
                        var hasAppleTvControl = md.Services.Contains("_companion-link._tcp.local") || md.Services.Contains("_mediaremotetv._tcp.local");
                        if (!hasAirplay && !hasAppleTvControl) continue;

                        var host = string.IsNullOrWhiteSpace(md.InstanceName)
                            ? $"Host-{mkvp.Key.Split('.').LastOrDefault() ?? mkvp.Key}"
                            : md.InstanceName;

                        var mergedType = hasAppleTvControl ? "Apple TV" : "Apple AirPlay Receiver";
                        var mergedPorts = new List<int>();
                        if (md.Services.Contains("_airplay._tcp.local")) mergedPorts.Add(7000);
                        if (md.Services.Contains("_raop._tcp.local")) mergedPorts.Add(7001);

                        state.Results.TryAdd(mkvp.Key, new ScanResult
                        {
                            ip = mkvp.Key,
                            hostname = host,
                            ports = mergedPorts.Distinct().OrderBy(p => p).ToList(),
                            type = mergedType,
                            responseTime = -1,
                            httpTitle = hasAppleTvControl ? "Apple TV (mDNS)" : "AirPlay (mDNS)",
                            mac = "",
                            vendor = "Apple",
                            isCrestron = false,
                            crestronModel = "",
                        });
                    }

                    foreach (var kvp in state.Results)
                    {
                        var r = kvp.Value;

                        // Fill MAC from batch ARP if SendARP missed
                        if (string.IsNullOrEmpty(r.mac) && arpTable.TryGetValue(r.ip, out var arpMac))
                            r.mac = arpMac;

                        // Resolve vendor from MAC
                        if (!string.IsNullOrEmpty(r.mac) && string.IsNullOrEmpty(r.vendor))
                            r.vendor = LookupVendor(r.mac);

                        // Enrich from SSDP discovery
                        if (ssdpDevices.TryGetValue(r.ip, out var ssdp))
                        {
                            if (string.IsNullOrEmpty(r.hostname) && !string.IsNullOrEmpty(ssdp.FriendlyName))
                                r.hostname = ssdp.FriendlyName;
                            if (string.IsNullOrEmpty(r.vendor) && !string.IsNullOrEmpty(ssdp.Manufacturer))
                                r.vendor = ssdp.Manufacturer;
                            if (string.IsNullOrEmpty(r.httpTitle) && !string.IsNullOrEmpty(ssdp.FriendlyName))
                                r.httpTitle = ssdp.FriendlyName;

                            // Use SSDP model name as Crestron model fallback
                            if (string.IsNullOrEmpty(r.crestronModel) && !string.IsNullOrEmpty(ssdp.ModelName))
                            {
                                var modelMatch = System.Text.RegularExpressions.Regex.Match(
                                    ssdp.ModelName,
                                    @"\b(CP[234N]-?[A-Z0-9]*|RMC[34]-?[A-Z0-9]*|DMPS3?-[A-Z0-9]+|DM-MD[0-9x]+[A-Z]*|MC[34]-?[A-Z0-9]*|PRO[34]-?[A-Z0-9]*|TSW-[0-9]+[A-Z]*|TS-[0-9]+[A-Z]*|AV[34]-?[A-Z0-9]+|HD-MD[0-9x]+[A-Z]*|DM-NVX-[A-Z0-9]+|UC-[A-Z0-9]+|CEN-[A-Z0-9]+|SWAMP[AE]-?[0-9]+)\b",
                                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                                if (modelMatch.Success)
                                    r.crestronModel = modelMatch.Groups[1].Value.ToUpperInvariant();
                                else if (ssdp.Manufacturer?.IndexOf("Crestron", StringComparison.OrdinalIgnoreCase) >= 0)
                                    r.crestronModel = ssdp.ModelName.Trim();
                            }

                            // Use SSDP manufacturer to set vendor for Crestron
                            if (!string.IsNullOrEmpty(ssdp.Manufacturer)
                                && ssdp.Manufacturer.IndexOf("Crestron", StringComparison.OrdinalIgnoreCase) >= 0)
                                r.vendor = "Crestron";
                        }

                        // Enrich from mDNS service fingerprints
                        if (mdnsDevices.TryGetValue(r.ip, out var mdns))
                        {
                            if (string.IsNullOrEmpty(r.hostname) && !string.IsNullOrEmpty(mdns.InstanceName))
                                r.hostname = mdns.InstanceName;

                            var hasAirplay = mdns.Services.Contains("_airplay._tcp.local") || mdns.Services.Contains("_raop._tcp.local");
                            var hasAppleTvControl = mdns.Services.Contains("_companion-link._tcp.local") || mdns.Services.Contains("_mediaremotetv._tcp.local");

                            if (hasAirplay && hasAppleTvControl)
                            {
                                r.vendor = "Apple";
                                if (string.IsNullOrEmpty(r.httpTitle)) r.httpTitle = "Apple TV";
                                if (string.IsNullOrEmpty(r.hostname) || r.hostname.Equals("Mac", StringComparison.OrdinalIgnoreCase))
                                {
                                    var lastOctet = r.ip.Split('.').LastOrDefault() ?? r.ip;
                                    r.hostname = "AppleTV-" + lastOctet;
                                }
                                r.type = "Apple TV";
                            }
                            else if (mdns.Services.Contains("_raop._tcp.local") && mdns.Services.Contains("_airplay._tcp.local")
                                     && mdns.Services.Any(s => s.Contains("sleep-proxy")))
                            {
                                if (string.IsNullOrEmpty(r.vendor)) r.vendor = "Apple";
                                if (string.IsNullOrEmpty(r.type) || r.type == "Unknown") r.type = "Apple AirPlay Receiver";
                            }
                        }

                        // Re-classify with all enriched data
                        if (r.type != "Apple TV")
                            r.type = ClassifyDevice(r.ports, r.httpTitle, r.vendor, r.hostname);
                        r.isCrestron = r.type == "Crestron"
                            || (!string.IsNullOrEmpty(r.vendor) && r.vendor.Equals("Crestron", StringComparison.OrdinalIgnoreCase))
                            || (!string.IsNullOrEmpty(r.hostname) && r.hostname.IndexOf("crestron", StringComparison.OrdinalIgnoreCase) >= 0)
                            || !string.IsNullOrEmpty(r.crestronModel);
                        if (r.isCrestron) r.type = "Crestron";
                    }
                }

                state.Status = state.Cts.IsCancellationRequested ? "cancelled" : "completed";
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Scan {Id} failed.", scanId);
                state.Status = "error";
                state.Error = ex.Message;
            }
            finally
            {
                Interlocked.Decrement(ref _activeScanCount);

                // Auto-cleanup after 1 hour
                _ = Task.Delay(TimeSpan.FromHours(1)).ContinueWith(t => { _scans.TryRemove(scanId, out var removed); });
            }
        });

        return scanId;
    }

    public static object? GetScan(string scanId)
    {
        if (!_scans.TryGetValue(scanId, out var state)) return null;
        var progress = state.TotalHosts > 0 ? (int)(state.ScannedHosts * 100.0 / state.TotalHosts) : 0;
        return new
        {
            id = state.Id,
            status = state.Status,
            progress,
            total = state.TotalHosts,
            scanned = (int)state.ScannedHosts,
            results = state.Results.Values.ToList(),
            error = state.Error,
            startedAt = state.StartedAt.ToString("o"),
        };
    }

    public static object ListScans()
    {
        return _scans.Values.Select(s => new
        {
            id = s.Id,
            status = s.Status,
            progress = s.TotalHosts > 0 ? (int)(s.ScannedHosts * 100.0 / s.TotalHosts) : 0,
            total = s.TotalHosts,
            resultCount = s.Results.Count,
            startedAt = s.StartedAt.ToString("o"),
        }).ToList();
    }

    public static bool CancelScan(string scanId)
    {
        if (!_scans.TryGetValue(scanId, out var state)) return false;
        state.Cts.Cancel();
        state.Status = "cancelled";
        return true;
    }

    static async Task<ScanResult?> ScanHostAsync(IPAddress ip, CancellationToken ct)
    {
        // Step 1: Ping (best effort only — do not hard-fail on ICMP blocked hosts)
        long pingMs = -1;
        bool pingOk = false;
        try
        {
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(ip, 700);
            pingOk = reply.Status == IPStatus.Success;
            if (pingOk) pingMs = reply.RoundtripTime;
        }
        catch { }

        // Step 2: MAC via SendARP — direct ARP request, guaranteed for LAN hosts
        var mac = ResolveArp(ip);
        var vendor = LookupVendor(mac);
        string hostname = "";

        // Step 3: TCP port probe (parallel)
        var openPorts = new List<int>();
        var portTasks = ProbePorts.Select(async port =>
        {
            try
            {
                using var client = new TcpClient();
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(1200);
                await client.ConnectAsync(ip, port, cts.Token);
                lock (openPorts) { openPorts.Add(port); }
            }
            catch { }
        });
        await Task.WhenAll(portTasks);

        // If host neither pings nor exposes any known service port, ignore it.
        if (!pingOk && openPorts.Count == 0) return null;

        string httpTitle = "";
        string crestronModel = "";

        // Apple TV / AirPlay hint probe (works even when /info returns 403)
        string airplayServerHeader = "";
        string airplayNameHint = "";
        string airplayModelHint = "";
        if (openPorts.Contains(7000) || openPorts.Contains(7001))
        {
            foreach (var airplayPort in new[] { 7000, 7001 })
            {
                if (!openPorts.Contains(airplayPort)) continue;
                try
                {
                    using var handler = new HttpClientHandler
                    {
                        ServerCertificateCustomValidationCallback = (_, _, _, _) => true,
                    };
                    using var http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(2) };
                    using var req = new HttpRequestMessage(HttpMethod.Get, $"http://{ip}:{airplayPort}/info");
                    req.Headers.TryAddWithoutValidation("User-Agent", "JoinListApi-Scanner/1.0");
                    var resp = await http.SendAsync(req, ct);
                    if (resp.Headers.Server != null)
                    {
                        var serverStr = resp.Headers.Server.ToString();
                        if (!string.IsNullOrWhiteSpace(serverStr))
                        {
                            airplayServerHeader = serverStr.Trim();
                        }
                    }

                    try
                    {
                        var infoBytes = await resp.Content.ReadAsByteArrayAsync(ct);
                        var infoText = GetPrintableAscii(infoBytes);
                        if (string.IsNullOrEmpty(airplayModelHint))
                        {
                            var mm = System.Text.RegularExpressions.Regex.Match(
                                infoText,
                                @"\b(AppleTV\d+,\d+|Mac\d+,\d+|Camera[A-Za-z0-9._-]*|Sonos)\b",
                                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                            if (mm.Success) airplayModelHint = mm.Groups[1].Value.Trim();
                        }

                        if (string.IsNullOrEmpty(airplayNameHint))
                        {
                            if (infoText.IndexOf("MacBook", StringComparison.OrdinalIgnoreCase) >= 0)
                                airplayNameHint = "MacBook";
                            else
                            {
                                var nameMatch = System.Text.RegularExpressions.Regex.Match(
                                    infoText,
                                    @"\b(Camera[A-Za-z0-9._-]*|Apple\s*TV|Sonos[A-Za-z0-9._-]*)\b",
                                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                                if (nameMatch.Success) airplayNameHint = nameMatch.Groups[1].Value.Trim();
                            }
                        }
                    }
                    catch
                    {
                        // ignore parsing issues
                    }

                    if (!string.IsNullOrEmpty(airplayServerHeader) && !string.IsNullOrEmpty(airplayNameHint))
                        break;
                }
                catch
                {
                    // ignore and keep best-effort detection
                }
            }

            if (!string.IsNullOrEmpty(airplayServerHeader)
                && airplayServerHeader.IndexOf("AirTunes", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                if (string.IsNullOrEmpty(vendor)) vendor = "Apple";
                if (string.IsNullOrEmpty(httpTitle)) httpTitle = airplayServerHeader;

                var nameLower = (airplayNameHint ?? "").ToLowerInvariant();
                var modelLower = (airplayModelHint ?? "").ToLowerInvariant();
                if (nameLower.Contains("sonos") || modelLower.Contains("sonos"))
                {
                    vendor = "Sonos";
                    if (string.IsNullOrEmpty(hostname) || hostname.Equals("Host-" + ip.ToString().Split('.').LastOrDefault(), StringComparison.OrdinalIgnoreCase))
                        hostname = "Sonos";
                    httpTitle = "Sonos AirPlay";
                }
                else if (nameLower.Contains("camera") || modelLower.Contains("camera"))
                {
                    if (string.IsNullOrEmpty(vendor)) vendor = "Camera";
                    if (!string.IsNullOrEmpty(airplayNameHint)) hostname = airplayNameHint;
                    if (string.IsNullOrEmpty(httpTitle)) httpTitle = "Camera AirPlay";
                }
                else if (nameLower.Contains("macbook") || modelLower.StartsWith("mac"))
                {
                    vendor = "Apple";
                    if (!string.IsNullOrEmpty(airplayNameHint)) hostname = airplayNameHint;
                    if (string.IsNullOrEmpty(httpTitle) || httpTitle.IndexOf("AirTunes", StringComparison.OrdinalIgnoreCase) >= 0)
                        httpTitle = "Apple AirPlay Receiver";
                }
                else if (modelLower.StartsWith("appletv") || nameLower.Contains("apple tv"))
                {
                    vendor = "Apple";
                    if (string.IsNullOrEmpty(hostname)) hostname = "Apple TV";
                    if (string.IsNullOrEmpty(httpTitle) || httpTitle.IndexOf("AirTunes", StringComparison.OrdinalIgnoreCase) >= 0)
                        httpTitle = "Apple TV";
                }
            }
        }

        // Step 4: Hostname resolution
        if (string.IsNullOrWhiteSpace(hostname))
        {
            try
            {
                var entry = await Dns.GetHostEntryAsync(ip);
                hostname = entry.HostName ?? "";
                // DNS sometimes returns the IP itself as hostname
                if (IPAddress.TryParse(hostname, out _)) hostname = "";
                if (!string.IsNullOrWhiteSpace(hostname))
                {
                    hostname = hostname.Trim();
                    var dotIdx = hostname.IndexOf('.');
                    if (dotIdx > 0) hostname = hostname[..dotIdx];
                }
            }
            catch { }
        }

        // Step 5: HTTP probing — title + Crestron model detection
        var modelRegex = @"\b(CP[234N]-?[A-Z0-9]*|RMC[34]-?[A-Z0-9]*|DMPS3?-[A-Z0-9]+|DM-MD[0-9x]+[A-Z]*|DM-NVX-[A-Z0-9]+|MC[34]-?[A-Z0-9]*|PRO[34]-?[A-Z0-9]*|TSW-[0-9]+[A-Z]*|TS-[0-9]+[A-Z]*|AV[34]-?[A-Z0-9]+|HD-MD[0-9x]+[A-Z]*|UC-[A-Z0-9]+|CEN-[A-Z0-9]+|SWAMP[AE]-?[0-9]+)\b";
        var hasHttp = openPorts.Contains(80) || openPorts.Contains(443) || openPorts.Contains(8080);

        if (hasHttp)
        {
            var httpPort = openPorts.Contains(443) ? 443 : openPorts.Contains(80) ? 80 : 8080;
            var scheme = httpPort == 443 ? "https" : "http";

            try
            {
                using var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (_, _, _, _) => true,
                };
                using var http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(3) };
                var response = await http.GetAsync($"{scheme}://{ip}:{httpPort}/", ct);
                var html = await response.Content.ReadAsStringAsync(ct);

                var titleMatch = System.Text.RegularExpressions.Regex.Match(
                    html, @"<title>(.*?)</title>",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);
                if (titleMatch.Success)
                {
                    var rawTitle = titleMatch.Groups[1].Value.Trim();
                    // Discard error/auth page titles — they are not real device names
                    var titleLower = rawTitle.ToLowerInvariant();
                    var isErrorTitle = titleLower.Contains("access denied")
                        || titleLower.Contains("unauthorized")
                        || titleLower.Contains("forbidden")
                        || titleLower.Contains("404")
                        || titleLower.Contains("not found")
                        || titleLower.Contains("error");
                    if (!isErrorTitle && !string.IsNullOrEmpty(rawTitle))
                        httpTitle = rawTitle;
                }

                // Crestron model from HTML (expanded for all product families)
                var modelMatch = System.Text.RegularExpressions.Regex.Match(
                    httpTitle + " " + html, modelRegex,
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (modelMatch.Success) crestronModel = modelMatch.Groups[1].Value.ToUpperInvariant();

                // Crestron detection from Server header
                if (response.Headers.Server != null)
                {
                    var serverStr = response.Headers.Server.ToString();

                    // Specific model from Server header (e.g., "Crestron/MC4-R")
                    if (string.IsNullOrEmpty(crestronModel))
                    {
                        var serverModelMatch = System.Text.RegularExpressions.Regex.Match(
                            serverStr, modelRegex,
                            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                        if (serverModelMatch.Success)
                            crestronModel = serverModelMatch.Groups[1].Value.ToUpperInvariant();
                    }

                    // 3-Series identification: "Microsoft-WinCE" = Crestron 3-Series processor
                    if (string.IsNullOrEmpty(crestronModel)
                        && serverStr.IndexOf("WinCE", StringComparison.OrdinalIgnoreCase) >= 0
                        && openPorts.Contains(41794))
                    {
                        crestronModel = "3-Series";
                    }

                    // "Crestron Webserver" without specific model — mark as Crestron
                    if (string.IsNullOrEmpty(crestronModel)
                        && serverStr.IndexOf("Crestron", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        crestronModel = "Crestron Device";
                    }
                }
            }
            catch { }

            // Crestron DeviceInfo REST probe — try multiple endpoints
            // Many Crestron devices expose info even without CIP port
            if (string.IsNullOrEmpty(crestronModel) && hasHttp)
            {
                var probeUrls = new[]
                {
                    $"{scheme}://{ip}/Device/DeviceInfo",
                    $"{scheme}://{ip}/cws/config/device",
                    $"{scheme}://{ip}/api/config/device",
                    $"{scheme}://{ip}/cgi-bin/info.cgi",
                };

                foreach (var probeUrl in probeUrls)
                {
                    if (!string.IsNullOrEmpty(crestronModel)) break;
                    try
                    {
                        using var handler2 = new HttpClientHandler
                        {
                            ServerCertificateCustomValidationCallback = (_, _, _, _) => true,
                        };
                        using var http2 = new HttpClient(handler2) { Timeout = TimeSpan.FromSeconds(2) };
                        var json = await http2.GetStringAsync(probeUrl, ct);

                        // Try JSON parse
                        try
                        {
                            using var doc = JsonDocument.Parse(json);
                            // Check "Model", "model", "DeviceModel"
                            foreach (var prop in new[] { "Model", "model", "DeviceModel", "ProductName", "productName" })
                            {
                                if (doc.RootElement.TryGetProperty(prop, out var modelEl))
                                {
                                    var m = (modelEl.GetString() ?? "").Trim();
                                    if (!string.IsNullOrEmpty(m))
                                    {
                                        crestronModel = m.ToUpperInvariant();
                                        break;
                                    }
                                }
                            }

                            if (string.IsNullOrEmpty(hostname))
                            {
                                foreach (var prop in new[] { "HostName", "hostname", "DeviceName", "deviceName", "Name", "name" })
                                {
                                    if (doc.RootElement.TryGetProperty(prop, out var hnEl))
                                    {
                                        var hn = (hnEl.GetString() ?? "").Trim();
                                        if (!string.IsNullOrEmpty(hn)) { hostname = hn; break; }
                                    }
                                }
                            }
                        }
                        catch { }

                        // Fallback: try regex on the raw response for model numbers
                        if (string.IsNullOrEmpty(crestronModel))
                        {
                            var jsonModelMatch = System.Text.RegularExpressions.Regex.Match(
                                json, modelRegex,
                                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                            if (jsonModelMatch.Success)
                                crestronModel = jsonModelMatch.Groups[1].Value.ToUpperInvariant();
                        }
                    }
                    catch { }
                }
            }
        }

        // Fallback hostname from HTTP title (skip generic/error titles)
        if (string.IsNullOrEmpty(hostname) && !string.IsNullOrEmpty(httpTitle))
        {
            var tl = httpTitle.ToLowerInvariant();
            var isGeneric = tl == "crestron" || tl == "crestron device"
                || tl.Contains("access denied") || tl.Contains("unauthorized")
                || tl.Contains("login") || tl.Contains("index");
            if (!isGeneric)
                hostname = httpTitle;
        }

        // Step 6: Classify
        var deviceType = ClassifyDevice(openPorts, httpTitle, vendor, hostname);

           var hostLooksNonTv = (!string.IsNullOrEmpty(hostname) &&
            (hostname.IndexOf("sonos", StringComparison.OrdinalIgnoreCase) >= 0
               || hostname.IndexOf("camera", StringComparison.OrdinalIgnoreCase) >= 0
               || hostname.IndexOf("mac", StringComparison.OrdinalIgnoreCase) >= 0));

        var isAppleTv = !hostLooksNonTv && (
            deviceType == "Apple TV"
            || (openPorts.Contains(7000) && !string.IsNullOrEmpty(vendor) && vendor.IndexOf("Apple", StringComparison.OrdinalIgnoreCase) >= 0
                && (airplayModelHint.StartsWith("AppleTV", StringComparison.OrdinalIgnoreCase)
                    || (airplayNameHint ?? "").IndexOf("Apple TV", StringComparison.OrdinalIgnoreCase) >= 0))
            || (!string.IsNullOrEmpty(airplayServerHeader) && airplayServerHeader.IndexOf("AirTunes", StringComparison.OrdinalIgnoreCase) >= 0)
            || (!string.IsNullOrEmpty(httpTitle) &&
                (httpTitle.IndexOf("Apple TV", StringComparison.OrdinalIgnoreCase) >= 0
                 || httpTitle.IndexOf("AirTunes", StringComparison.OrdinalIgnoreCase) >= 0
                 || httpTitle.IndexOf("AirPlay", StringComparison.OrdinalIgnoreCase) >= 0)));

        if (isAppleTv)
        {
            deviceType = "Apple TV";
            if (string.IsNullOrEmpty(vendor)) vendor = "Apple";
            var hn = hostname ?? "";
            if (string.IsNullOrWhiteSpace(hn) || hn.Equals("Mac", StringComparison.OrdinalIgnoreCase))
            {
                var ipText = ip.ToString();
                var lastOctet = ipText.Split('.').LastOrDefault() ?? ipText;
                hostname = $"AppleTV-{lastOctet}";
            }
        }

        var isCrestron = deviceType == "Crestron"
            || (!string.IsNullOrEmpty(vendor) && vendor.Equals("Crestron", StringComparison.OrdinalIgnoreCase))
            || (!string.IsNullOrEmpty(hostname) && hostname.IndexOf("crestron", StringComparison.OrdinalIgnoreCase) >= 0)
            || !string.IsNullOrEmpty(crestronModel);

        if (string.IsNullOrWhiteSpace(hostname))
        {
            if (!string.IsNullOrWhiteSpace(crestronModel))
            {
                hostname = crestronModel.Trim();
            }
            else if (!string.IsNullOrWhiteSpace(httpTitle))
            {
                hostname = httpTitle.Trim();
            }
            else if (!string.IsNullOrWhiteSpace(vendor))
            {
                hostname = vendor.Trim();
            }
            else
            {
                var ipText = ip.ToString();
                var lastOctet = ipText.Split('.').LastOrDefault() ?? ipText;
                hostname = isCrestron ? $"Crestron-{lastOctet}" : $"Host-{lastOctet}";
            }
        }

        return new ScanResult
        {
            ip = ip.ToString(),
            hostname = hostname,
            ports = openPorts.OrderBy(p => p).ToList(),
            type = isCrestron ? "Crestron" : deviceType,
            responseTime = pingMs,
            httpTitle = httpTitle,
            mac = mac,
            vendor = string.IsNullOrEmpty(vendor) ? "" : vendor,
            isCrestron = isCrestron,
            crestronModel = crestronModel,
        };
    }

    static string ClassifyDevice(List<int> ports, string httpTitle = "", string vendor = "", string hostname = "")
    {
        var h = (hostname ?? "").ToLowerInvariant();
        if (h.Contains("sonos")) return "Sonos";
        if (h.Contains("camera")) return "Camera";
        if (h.Contains("macbook") || h == "mac") return "Apple AirPlay Receiver";

        // Vendor-based classification first
        if (!string.IsNullOrEmpty(vendor))
        {
            var v = vendor.ToLowerInvariant();
            if (v.Contains("crestron")) return "Crestron";
            if (v.Contains("apple"))
            {
                if (h.Contains("sonos") || h.Contains("camera")) return "Apple Device";
                if (h.Contains("macbook") || h == "mac") return "Apple AirPlay Receiver";
                if (ports.Contains(7000) || ports.Contains(7001)) return "Apple TV";
                return "Apple Device";
            }
            if (v.Contains("extron")) return "Extron";
            if (v.Contains("biamp")) return "Biamp DSP";
            if (v.Contains("qsc")) return "QSC DSP";
            if (v.Contains("shure")) return "Shure Audio";
            if (v.Contains("atlona")) return "Atlona";
            if (v.Contains("lutron")) return "Lutron";
            if (v.Contains("amx") || v.Contains("harman")) return "AMX/Harman";
            if (v.Contains("denon") || v.Contains("marantz")) return "Denon/Marantz";
            if (v.Contains("shelly")) return "Shelly IoT";
        }

        if (ports.Contains(41794)) return "Crestron";
        if (ports.Contains(7000) || ports.Contains(7001)) return "AirPlay Device";
        if (ports.Contains(4998)) return "PJLink Projector";
        if (ports.Contains(502)) return "Modbus Device";
        if (ports.Contains(47808)) return "BACnet Device";

        // Check HTTP title for known vendor names
        if (!string.IsNullOrEmpty(httpTitle))
        {
            var titleLower = httpTitle.ToLowerInvariant();
            if (titleLower.Contains("crestron")) return "Crestron";
            if (titleLower.Contains("sonos")) return "Sonos";
            if (titleLower.Contains("camera")) return "Camera";
            if (titleLower.Contains("apple airplay receiver") || titleLower.Contains("macbook")) return "Apple AirPlay Receiver";
            if (titleLower.Contains("apple tv") || titleLower.Contains("airtunes") || titleLower.Contains("airplay")) return "Apple TV";
            if (titleLower.Contains("extron")) return "Extron";
            if (titleLower.Contains("biamp")) return "Biamp DSP";
            if (titleLower.Contains("qsc")) return "QSC DSP";
            if (titleLower.Contains("shure")) return "Shure Audio";
            if (titleLower.Contains("atlona")) return "Atlona";
            if (titleLower.Contains("lutron")) return "Lutron";
        }

        if (ports.Contains(23) && (ports.Contains(80) || ports.Contains(443))) return "Network Device";
        if (ports.Contains(80) || ports.Contains(443)) return "Web Device";
        if (ports.Contains(23)) return "Telnet Device";
        return "Unknown";
    }

    static string GetPrintableAscii(byte[] bytes)
    {
        if (bytes == null || bytes.Length == 0) return string.Empty;
        var chars = new char[bytes.Length];
        for (int i = 0; i < bytes.Length; i++)
        {
            var b = bytes[i];
            chars[i] = (b >= 32 && b <= 126) ? (char)b : ' ';
        }
        return new string(chars);
    }

    static List<IPAddress> ParseCidr(string cidr)
    {
        var hosts = new List<IPAddress>();

        var parts = cidr.Trim().Split('/');
        if (parts.Length != 2 || !IPAddress.TryParse(parts[0], out var networkAddr) || !int.TryParse(parts[1], out var prefixLen))
        {
            // Try as single IP
            if (IPAddress.TryParse(cidr.Trim(), out var singleIp))
            {
                hosts.Add(singleIp);
                return hosts;
            }
            throw new ArgumentException($"Invalid CIDR notation: '{cidr}'. Expected format: 192.168.1.0/24");
        }

        if (prefixLen < 16 || prefixLen > 32)
        {
            throw new ArgumentException($"Prefix length must be between 16 and 32, got /{prefixLen}.");
        }

        var networkBytes = networkAddr.GetAddressBytes();
        var networkUint = (uint)(networkBytes[0] << 24 | networkBytes[1] << 16 | networkBytes[2] << 8 | networkBytes[3]);
        var hostBits = 32 - prefixLen;
        var hostCount = (1u << hostBits) - 2; // exclude network and broadcast

        if (hostBits <= 1)
        {
            hosts.Add(networkAddr);
            return hosts;
        }

        var networkMasked = networkUint & (0xFFFFFFFFu << hostBits);
        for (uint i = 1; i <= hostCount && i <= 1024; i++)
        {
            var ip = networkMasked + i;
            hosts.Add(new IPAddress(new[]
            {
                (byte)(ip >> 24), (byte)(ip >> 16), (byte)(ip >> 8), (byte)ip
            }));
        }

        return hosts;
    }

    class ScanState
    {
        public string Id { get; set; } = "";
        public string Status { get; set; } = "pending";
        public int TotalHosts { get; set; }
        public long ScannedHosts;
        public ConcurrentDictionary<string, ScanResult> Results { get; } = new();
        public string? Error { get; set; }
        public DateTime StartedAt { get; set; }
        public CancellationTokenSource Cts { get; } = new();
    }

    class ScanResult
    {
        public string ip { get; set; } = "";
        public string hostname { get; set; } = "";
        public List<int> ports { get; set; } = new();
        public string type { get; set; } = "";
        public long responseTime { get; set; }
        public string httpTitle { get; set; } = "";
        public string mac { get; set; } = "";
        public string vendor { get; set; } = "";
        public bool isCrestron { get; set; }
        public string crestronModel { get; set; } = "";
    }

    // OUI prefix → vendor name (expanded database — 3-byte MAC prefix)
    static readonly Dictionary<string, string> OuiVendors = new(StringComparer.OrdinalIgnoreCase)
    {
        // ── Crestron ──
        ["00:10:7F"] = "Crestron", ["00:10:C3"] = "Crestron", ["00:1A:2B"] = "Crestron",
        ["00:24:A8"] = "Crestron", ["B8:D8:12"] = "Crestron",
        ["C4:42:68"] = "Crestron", ["00:1D:B5"] = "Crestron", ["00:22:9C"] = "Crestron",
        // ── Extron ──
        ["00:0E:7B"] = "Extron", ["00:1D:C1"] = "Extron", ["00:60:B5"] = "Extron",
        // ── DSP & Audio ──
        ["00:0A:E4"] = "QSC", ["00:21:CC"] = "Biamp", ["00:0D:6B"] = "Shure",
        ["00:1B:66"] = "Symetrix", ["00:22:CF"] = "Poly",
        // ── Lighting & Control ──
        ["00:0F:F7"] = "Lutron", ["00:90:0B"] = "Lutron",
        ["00:04:A3"] = "AMX/Harman", ["00:60:9F"] = "Savant",
        // ── AV Switching ──
        ["C8:2C:2B"] = "Atlona", ["00:14:39"] = "Atlona",
        ["00:05:CD"] = "Denon/Marantz", ["70:B3:D5"] = "AV Device",
        // ── IoT ──
        ["AC:CF:23"] = "Shelly", ["34:94:54"] = "Shelly", ["E8:DB:84"] = "Shelly",
        // ── Ubiquiti ──
        ["44:D9:E7"] = "Ubiquiti", ["78:8A:20"] = "Ubiquiti", ["DC:9F:DB"] = "Ubiquiti",
        ["24:5A:4C"] = "Ubiquiti", ["74:AC:B9"] = "Ubiquiti", ["B4:FB:E4"] = "Ubiquiti",
        ["FC:EC:DA"] = "Ubiquiti", ["68:D7:9A"] = "Ubiquiti", ["E0:63:DA"] = "Ubiquiti",
        // ── Cisco ──
        ["00:1E:BD"] = "Cisco", ["00:25:B5"] = "Cisco", ["3C:FD:FE"] = "Cisco",
        ["00:17:94"] = "Cisco", ["00:1B:0D"] = "Cisco", ["F4:CF:E2"] = "Cisco",
        // ── TP-Link ──
        ["08:36:C9"] = "TP-Link", ["50:C7:BF"] = "TP-Link", ["60:32:B1"] = "TP-Link",
        ["B0:95:75"] = "TP-Link", ["B0:BE:76"] = "TP-Link", ["54:AF:97"] = "TP-Link",
        // ── Netgear ──
        ["00:26:F2"] = "Netgear", ["A0:63:91"] = "Netgear", ["9C:3D:CF"] = "Netgear",
        // ── ASUS ──
        ["A8:5E:45"] = "ASUS", ["04:D4:C4"] = "ASUS", ["50:46:5D"] = "ASUS",
        // ── Smart Home & Media ──
        ["B4:B5:B6"] = "Sonos", ["00:0E:58"] = "Sonos", ["34:7E:5C"] = "Sonos",
        ["48:A6:B8"] = "Sonos", ["54:2A:1B"] = "Sonos", ["78:28:CA"] = "Sonos",
        ["E4:F0:42"] = "Google/Nest", ["48:D6:D5"] = "Google/Nest", ["30:FD:38"] = "Google/Nest",
        ["F0:D4:F6"] = "Ring", ["18:B4:30"] = "Nest",
        ["00:17:88"] = "Philips Hue", ["EC:B5:FA"] = "Philips Hue",
        // ── Cameras ──
        ["C0:56:27"] = "Hikvision", ["28:57:BE"] = "Hikvision",
        ["A0:BD:1D"] = "Dahua", ["3C:EF:8C"] = "Dahua",
        ["9C:8E:CD"] = "Axis", ["00:40:8C"] = "Axis",
        // ── SBC ──
        ["B8:27:EB"] = "Raspberry Pi", ["DC:A6:32"] = "Raspberry Pi", ["E4:5F:01"] = "Raspberry Pi",
        ["D8:3A:DD"] = "Raspberry Pi", ["2C:CF:67"] = "Raspberry Pi",
        // ── Apple ──
        ["7C:49:EB"] = "Apple", ["A4:D1:8C"] = "Apple", ["38:C9:86"] = "Apple",
        ["F0:18:98"] = "Apple", ["3C:22:FB"] = "Apple",
        // ── Samsung ──
        ["8C:85:80"] = "Samsung", ["6C:5D:3A"] = "Samsung", ["78:47:1D"] = "Samsung",
        // ── Dell / HP / VMware ──
        ["00:1A:A0"] = "Dell", ["F8:BC:12"] = "Dell", ["B0:83:FE"] = "Dell",
        ["00:1E:0B"] = "HP", ["3C:D9:2B"] = "HP", ["94:57:A5"] = "HP",
        ["00:50:56"] = "VMware", ["00:0C:29"] = "VMware",
    };

    /// <summary>
    /// Batch ARP table as fallback for hosts where SendARP returned empty.
    /// </summary>
    static Dictionary<string, string> BuildArpTable()
    {
        var table = new Dictionary<string, string>();
        try
        {
            var psi = new System.Diagnostics.ProcessStartInfo("arp", "-a")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            using var proc = System.Diagnostics.Process.Start(psi);
            if (proc == null) return table;
            var output = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit(3000);
            foreach (var line in output.Split('\n'))
            {
                var trimmed = line.Trim();
                if (string.IsNullOrEmpty(trimmed)) continue;
                var parts = trimmed.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 2) continue;
                if (!IPAddress.TryParse(parts[0], out _)) continue;
                var mac = parts[1].Replace('-', ':').ToUpperInvariant();
                if (mac.Length < 8 || !mac.Contains(':')) continue;
                if (mac.StartsWith("FF:FF:FF")) continue;
                table[parts[0]] = mac;
            }
        }
        catch { }
        return table;
    }

    static string LookupVendor(string mac)
    {
        if (string.IsNullOrEmpty(mac) || mac.Length < 8) return "";
        var prefix = mac[..8].ToUpperInvariant();
        return OuiVendors.TryGetValue(prefix, out var vendor) ? vendor : "";
    }

    /// <summary>
    /// SSDP/UPnP multicast discovery — finds devices advertising on the LAN.
    /// Sends M-SEARCH, collects responses for ~4s, fetches device description XML.
    /// </summary>
    static async Task<Dictionary<string, SsdpDevice>> DiscoverSsdpAsync(CancellationToken ct)
    {
        var devices = new ConcurrentDictionary<string, SsdpDevice>();
        try
        {
            using var udp = new UdpClient(0);
            var search = "M-SEARCH * HTTP/1.1\r\n" +
                "HOST: 239.255.255.250:1900\r\n" +
                "MAN: \"ssdp:discover\"\r\n" +
                "MX: 3\r\n" +
                "ST: ssdp:all\r\n\r\n";
            var msg = Encoding.UTF8.GetBytes(search);
            var ep = new IPEndPoint(IPAddress.Parse("239.255.255.250"), 1900);

            // Send twice for reliability
            await udp.SendAsync(msg, msg.Length, ep);
            await Task.Delay(300, ct);
            await udp.SendAsync(msg, msg.Length, ep);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(4000);

            while (!cts.IsCancellationRequested)
            {
                try
                {
                    var result = await udp.ReceiveAsync(cts.Token);
                    var ip = result.RemoteEndPoint.Address.ToString();
                    var response = Encoding.UTF8.GetString(result.Buffer);

                    var dev = new SsdpDevice();
                    foreach (var line in response.Split("\r\n"))
                    {
                        var colonIdx = line.IndexOf(':');
                        if (colonIdx <= 0) continue;
                        var key = line[..colonIdx].Trim().ToUpperInvariant();
                        var val = line[(colonIdx + 1)..].Trim();
                        switch (key)
                        {
                            case "SERVER": dev.Server = val; break;
                            case "LOCATION": dev.Location = val; break;
                        }
                    }
                    devices.TryAdd(ip, dev);
                }
                catch (OperationCanceledException) { break; }
                catch { }
            }

            // Fetch device description XML from LOCATION URLs
            var sem = new SemaphoreSlim(10);
            var fetchTasks = devices.Where(d => !string.IsNullOrEmpty(d.Value.Location))
                .Select(async kvp =>
                {
                    await sem.WaitAsync(ct);
                    try
                    {
                        using var handler = new HttpClientHandler
                        {
                            ServerCertificateCustomValidationCallback = (_, _, _, _) => true,
                        };
                        using var http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(2) };
                        var xml = await http.GetStringAsync(kvp.Value.Location, ct);
                        var fn = System.Text.RegularExpressions.Regex.Match(xml, @"<friendlyName>(.*?)</friendlyName>", System.Text.RegularExpressions.RegexOptions.Singleline);
                        var mf = System.Text.RegularExpressions.Regex.Match(xml, @"<manufacturer>(.*?)</manufacturer>", System.Text.RegularExpressions.RegexOptions.Singleline);
                        var mn = System.Text.RegularExpressions.Regex.Match(xml, @"<modelName>(.*?)</modelName>", System.Text.RegularExpressions.RegexOptions.Singleline);
                        if (fn.Success) kvp.Value.FriendlyName = fn.Groups[1].Value.Trim();
                        if (mf.Success) kvp.Value.Manufacturer = mf.Groups[1].Value.Trim();
                        if (mn.Success) kvp.Value.ModelName = mn.Groups[1].Value.Trim();
                    }
                    catch { }
                    finally { sem.Release(); }
                });
            await Task.WhenAll(fetchTasks);
        }
        catch { }
        return new Dictionary<string, SsdpDevice>(devices);
    }

    static async Task<Dictionary<string, MdnsDevice>> DiscoverMdnsAsync(CancellationToken ct)
    {
        var devices = new ConcurrentDictionary<string, MdnsDevice>();
        try
        {
            using var udp = new UdpClient(0);
            udp.Client.ReceiveTimeout = 1000;
            var ep = new IPEndPoint(IPAddress.Parse("224.0.0.251"), 5353);

            foreach (var service in MdnsServiceMarkers)
            {
                var query = BuildMdnsPtrQuery(service);
                await udp.SendAsync(query, query.Length, ep);
                await Task.Delay(50, ct);
            }

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(3500);

            while (!cts.IsCancellationRequested)
            {
                try
                {
                    var result = await udp.ReceiveAsync(cts.Token);
                    var ip = result.RemoteEndPoint.Address.ToString();
                    var textRaw = GetPrintableAscii(result.Buffer);
                    if (string.IsNullOrWhiteSpace(textRaw)) continue;
                    var text = textRaw.ToLowerInvariant();

                    var dev = devices.GetOrAdd(ip, _ => new MdnsDevice());
                    foreach (var marker in MdnsServiceMarkers)
                    {
                        if (text.Contains(marker)) dev.Services.Add(marker);
                    }

                    if (string.IsNullOrEmpty(dev.InstanceName))
                    {
                        var instanceMatch = System.Text.RegularExpressions.Regex.Match(
                            textRaw,
                            @"([a-z0-9][a-z0-9 _\-]{2,})\._(airplay|mediaremotetv|companion-link|raop)\._(tcp|udp)\.local",
                            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                        if (instanceMatch.Success)
                        {
                            var raw = instanceMatch.Groups[1].Value.Trim();
                            if (!string.IsNullOrWhiteSpace(raw))
                                dev.InstanceName = raw;
                        }
                    }
                }
                catch (OperationCanceledException) { break; }
                catch { }
            }
        }
        catch { }

        return devices.ToDictionary(k => k.Key, v => v.Value);
    }

    static byte[] BuildMdnsPtrQuery(string serviceName)
    {
        var bytes = new List<byte>();
        bytes.AddRange(new byte[]
        {
            0x00, 0x00, // ID
            0x00, 0x00, // flags
            0x00, 0x01, // QDCOUNT
            0x00, 0x00, // ANCOUNT
            0x00, 0x00, // NSCOUNT
            0x00, 0x00, // ARCOUNT
        });

        foreach (var label in serviceName.Split('.'))
        {
            if (string.IsNullOrEmpty(label)) continue;
            var lb = Encoding.ASCII.GetBytes(label);
            bytes.Add((byte)lb.Length);
            bytes.AddRange(lb);
        }
        bytes.Add(0x00); // root
        bytes.AddRange(new byte[] { 0x00, 0x0C }); // PTR
        bytes.AddRange(new byte[] { 0x00, 0x01 }); // IN
        return bytes.ToArray();
    }

    class SsdpDevice
    {
        public string Server { get; set; } = "";
        public string Location { get; set; } = "";
        public string FriendlyName { get; set; } = "";
        public string Manufacturer { get; set; } = "";
        public string ModelName { get; set; } = "";
    }

    class MdnsDevice
    {
        public HashSet<string> Services { get; } = new(StringComparer.OrdinalIgnoreCase);
        public string InstanceName { get; set; } = "";
    }
}

static class MockMediaBridge
{
    static readonly object _gate = new();
    static readonly Queue<object> _events = new();
    const int MaxEvents = 200;

    static string _appleTvIp = "192.168.23.165";
    static bool _pinRequested;
    static bool _paired;
    static string _activePin = "";
    static long _pinIssuedAt;
    static string _lastPinMasked = "";
    static long _lastPairingAt;
    static string _lastAppleTvCommand = "";
    static string _lastAppleTvRoom = "Bedroom";

    static string _bedroomSonosState = "stopped";
    static int _bedroomSonosVolume = 35;
    static string _bedroomSonosSource = "Spotify";
    static string _bedroomSonosTrack = "";
    static long _lastSonosAt;

    public static object RequireAppleTvPin(string ip)
    {
        lock (_gate)
        {
            _appleTvIp = string.IsNullOrWhiteSpace(ip) ? _appleTvIp : ip;
            _pinRequested = true;
            _activePin = Random.Shared.Next(1000, 10000).ToString();
            _pinIssuedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            PushEvent("appletv.require-pin", new { ip = _appleTvIp });
            return BuildAppleTvState();
        }
    }

    public static bool TryPairAppleTv(string ip, string pin, out object state, out string? error)
    {
        lock (_gate)
        {
            _appleTvIp = string.IsNullOrWhiteSpace(ip) ? _appleTvIp : ip;

            if (!_pinRequested || string.IsNullOrWhiteSpace(_activePin))
            {
                state = BuildAppleTvState();
                error = "PIN was not requested. Call /api/media/appletv/require-pin first.";
                return false;
            }

            if (!string.Equals(pin, _activePin, StringComparison.Ordinal))
            {
                state = BuildAppleTvState();
                error = "Invalid code.";
                return false;
            }

            _paired = true;
            _lastPairingAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _lastPinMasked = MaskPin(pin);
            _activePin = "";
            PushEvent("appletv.pair", new { ip = _appleTvIp, pin = _lastPinMasked });
            state = BuildAppleTvState();
            error = null;
            return true;
        }
    }

    public static bool IsAppleTvPaired()
    {
        lock (_gate) return _paired;
    }

    public static object SendAppleTvCommand(string room, string command)
    {
        lock (_gate)
        {
            _lastAppleTvRoom = string.IsNullOrWhiteSpace(room) ? "Bedroom" : room.Trim();
            _lastAppleTvCommand = command.Trim();
            PushEvent("appletv.command", new { room = _lastAppleTvRoom, command = _lastAppleTvCommand });
            return new
            {
                room = _lastAppleTvRoom,
                command = _lastAppleTvCommand,
                paired = _paired,
                at = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            };
        }
    }

    public static object SendBedroomSonosCommand(string command, string? source, int? volume)
    {
        lock (_gate)
        {
            var cmd = command.Trim().ToLowerInvariant();

            if (volume.HasValue)
                _bedroomSonosVolume = Math.Clamp(volume.Value, 0, 100);

            if (!string.IsNullOrWhiteSpace(source))
                _bedroomSonosSource = source.Trim();

            switch (cmd)
            {
                case "play":
                    _bedroomSonosState = "playing";
                    break;
                case "pause":
                    _bedroomSonosState = "paused";
                    break;
                case "stop":
                    _bedroomSonosState = "stopped";
                    break;
                case "next":
                    _bedroomSonosState = "playing";
                    _bedroomSonosTrack = "next-track";
                    break;
                case "prev":
                case "previous":
                    _bedroomSonosState = "playing";
                    _bedroomSonosTrack = "previous-track";
                    break;
                case "volume-up":
                    _bedroomSonosVolume = Math.Clamp(_bedroomSonosVolume + 5, 0, 100);
                    break;
                case "volume-down":
                    _bedroomSonosVolume = Math.Clamp(_bedroomSonosVolume - 5, 0, 100);
                    break;
            }

            _lastSonosAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            PushEvent("sonos.bedroom.command", new { command = cmd, source = _bedroomSonosSource, volume = _bedroomSonosVolume, state = _bedroomSonosState });

            return BuildSonosState();
        }
    }

    public static object GetState()
    {
        lock (_gate)
        {
            return new
            {
                mock = true,
                appleTv = BuildAppleTvState(),
                sonosBedroom = BuildSonosState(),
                events = _events.ToArray(),
            };
        }
    }

    public static object AcceptFeedback(string source, string type, string message, JsonElement payload)
    {
        lock (_gate)
        {
            var safeSource = string.IsNullOrWhiteSpace(source) ? "ui" : source.Trim();
            var safeType = string.IsNullOrWhiteSpace(type) ? "info" : type.Trim().ToLowerInvariant();
            var safeMessage = message?.Trim() ?? "";

            PushEvent($"feedback.{safeType}", new
            {
                source = safeSource,
                message = safeMessage,
                payload,
            });

            return new
            {
                source = safeSource,
                type = safeType,
                acceptedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                queueDepth = _events.Count,
            };
        }
    }

    static object BuildAppleTvState() => new
    {
        ip = _appleTvIp,
        pinRequested = _pinRequested,
        paired = _paired,
        mockPin = _activePin,
        pinIssuedAt = _pinIssuedAt,
        lastPin = _lastPinMasked,
        lastPairingAt = _lastPairingAt,
        lastCommand = _lastAppleTvCommand,
        lastRoom = _lastAppleTvRoom,
    };

    static object BuildSonosState() => new
    {
        room = "Bedroom",
        state = _bedroomSonosState,
        volume = _bedroomSonosVolume,
        source = _bedroomSonosSource,
        track = _bedroomSonosTrack,
        lastAt = _lastSonosAt,
    };

    static string MaskPin(string pin)
    {
        if (string.IsNullOrWhiteSpace(pin) || pin.Length < 2) return "**";
        return new string('*', pin.Length - 2) + pin[^2..];
    }

    static void PushEvent(string action, object payload)
    {
        _events.Enqueue(new
        {
            at = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            action,
            payload,
        });

        while (_events.Count > MaxEvents)
            _events.Dequeue();
    }
}

static class RealAppleTvBridge
{
    public static async Task<(bool ok, string message, object details)> RequirePin(string ip)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" });

        var url = $"http://{ip}:7000/pair-pin-start";
        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(4) };
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.TryAddWithoutValidation("User-Agent", "MediaControl/1.0");
            var resp = await http.SendAsync(req);
            var code = (int)resp.StatusCode;
            if (code >= 200 && code < 300)
            {
                return (true, "PIN requested on Apple TV screen.", new { ip, status = code });
            }

            return (false, $"Apple TV rejected PIN start ({code}).", new { ip, status = code });
        }
        catch (Exception ex)
        {
            return (false, $"Failed to reach Apple TV: {ex.Message}", new { ip });
        }
    }

    public static async Task<(bool ok, string message, object details)> Pair(string ip, string pin)
    {
        if (string.IsNullOrWhiteSpace(pin) || pin.Length != 4 || !pin.All(char.IsDigit))
            return (false, "pin must be a 4-digit code.", new { ip });

        var runner = await ResolveAtvRemoteRunner();
        if (!runner.ok)
        {
            return (false, "Real pairing requires a working atvremote runtime.", new
            {
                ip,
                hint = "Install pyatv on Python <=3.13 or with build tools so miniaudio can install.",
                probe = runner.error,
            });
        }

        var protocols = new[] { "companion", "airplay", "raop" };
        var attempts = new List<object>();
        foreach (var protocol in protocols)
        {
            var result = await RunProcess(
                runner.fileName,
                $"{runner.argsPrefix} --scan-hosts {ip} --protocol {protocol} pair",
                pin + "\n",
                30000);

            var all = (result.stdoutText + "\n" + result.stderrText).Trim();
            attempts.Add(new
            {
                protocol,
                exitCode = result.exitCode,
                output = TrimForLog(all),
            });

            if (result.exitCode == 0 &&
                (all.IndexOf("succeeded", StringComparison.OrdinalIgnoreCase) >= 0
                 || all.IndexOf("successfully paired", StringComparison.OrdinalIgnoreCase) >= 0
                 || all.IndexOf("already", StringComparison.OrdinalIgnoreCase) >= 0))
            {
                return (true, $"Apple TV paired via {protocol}.", new { ip, protocol, output = TrimForLog(all) });
            }
        }

        return (false, "Pairing failed in real mode (handshake not completed).", new { ip, attempts });
    }

    public static async Task<(bool ok, string message, object details)> SendCommand(string ip, string command)
    {
        var mapped = MapCommand(command);
        if (string.IsNullOrWhiteSpace(mapped))
            return (false, $"Unsupported Apple TV command: {command}", new { ip, command });

        var runner = await ResolveAtvRemoteRunner();
        if (!runner.ok)
            return (false, "Real command failed: atvremote runtime unavailable.", new { ip, command = mapped, probe = runner.error });

        var result = await RunProcess(runner.fileName, $"{runner.argsPrefix} --scan-hosts {ip} {mapped}", null, 12000);
        var all = (result.stdoutText + "\n" + result.stderrText).Trim();

        if (result.exitCode == 0)
        {
            return (true, "Apple TV command sent.", new { ip, command = mapped, output = TrimForLog(all) });
        }

        return (false, "Apple TV command failed.", new { ip, command = mapped, output = TrimForLog(all), exitCode = result.exitCode });
    }

    static string MapCommand(string command)
    {
        var cmd = command.Trim().ToLowerInvariant();
        return cmd switch
        {
            "menu" => "menu",
            "home" => "home",
            "topmenu" => "home",
            "select" => "select",
            "up" => "up",
            "down" => "down",
            "left" => "left",
            "right" => "right",
            "play" => "play",
            "pause" => "pause",
            "playpause" => "play_pause",
            "play_pause" => "play_pause",
            "next" => "next",
            "nextitem" => "next",
            "previous" => "previous",
            "prev" => "previous",
            "previtem" => "previous",
            _ => "",
        };
    }

    static string TrimForLog(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        value = value.Replace("\r", "").Trim();
        const int max = 1200;
        return value.Length <= max ? value : value[..max] + "...";
    }

    static async Task<(bool ok, string fileName, string argsPrefix, string error)> ResolveAtvRemoteRunner()
    {
        var direct = await RunProcess("atvremote", "--version", null, 4000);
        if (direct.exitCode == 0)
            return (true, "atvremote", "", "");

        var py313Module = await RunProcess("py", "-3.13 -m pyatv.scripts.atvremote --version", null, 6000);
        if (py313Module.exitCode == 0)
            return (true, "py", "-3.13 -m pyatv.scripts.atvremote", "");

        var pyModule = await RunProcess("python", "-m pyatv.scripts.atvremote --version", null, 6000);
        if (pyModule.exitCode == 0)
            return (true, "python", "-m pyatv.scripts.atvremote", "");

        var error =
            "atvremote PATH probe failed: " + TrimForLog((direct.stdoutText + " " + direct.stderrText).Trim()) +
            " | py -3.13 module probe failed: " + TrimForLog((py313Module.stdoutText + " " + py313Module.stderrText).Trim()) +
            " | python module probe failed: " + TrimForLog((pyModule.stdoutText + " " + pyModule.stderrText).Trim());
        return (false, "", "", error);
    }

    static async Task<(int exitCode, string stdoutText, string stderrText)> RunProcess(string fileName, string arguments, string? stdinText, int timeoutMs)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = stdinText != null,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = startInfo };
        process.Start();

        if (stdinText != null)
        {
            await process.StandardInput.WriteAsync(stdinText);
            process.StandardInput.Close();
        }

        var outTask = process.StandardOutput.ReadToEndAsync();
        var errTask = process.StandardError.ReadToEndAsync();

        var exited = process.WaitForExit(timeoutMs);
        if (!exited)
        {
            try { process.Kill(entireProcessTree: true); } catch { }
            var stdoutTimeout = await outTask;
            var stderrTimeout = await errTask;
            return (-1, stdoutTimeout, stderrTimeout + "\nTimed out.");
        }

        var stdout = await outTask;
        var stderr = await errTask;
        return (process.ExitCode, stdout, stderr);
    }
}

static class RealSonosBridge
{
    sealed class SonosDidlItem
    {
        public string Id { get; init; } = "";
        public string Title { get; init; } = "";
        public string Uri { get; init; } = "";
        public string ItemXml { get; init; } = "";
    }

    static readonly HttpClient _http = new()
    {
        Timeout = TimeSpan.FromSeconds(6),
    };

    public static async Task<(bool ok, string message, object details)> SendCommand(string ip, string command, string? source, int? volume)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" });

        if (volume.HasValue)
        {
            var vol = Math.Clamp(volume.Value, 0, 100);
            var volResult = await SetVolume(ip, vol);
            if (!volResult.ok)
                return (false, volResult.message, volResult.details);
        }

        if (!string.IsNullOrWhiteSpace(source))
        {
            var srcResult = await SetSource(ip, source.Trim());
            if (!srcResult.ok)
                return (false, srcResult.message, srcResult.details);
        }

        var cmd = (command ?? string.Empty).Trim().ToLowerInvariant();
        var action = cmd switch
        {
            "play" => "Play",
            "pause" => "Pause",
            "stop" => "Stop",
            "next" => "Next",
            "prev" => "Previous",
            "previous" => "Previous",
            "volume-up" => "VolumeUp",
            "volume-down" => "VolumeDown",
            _ => "",
        };

        if (string.IsNullOrWhiteSpace(action))
            return (false, $"Unsupported Sonos command: {command}", new { ip, command });

        if (action == "VolumeUp" || action == "VolumeDown")
        {
            var current = await GetVolume(ip);
            if (!current.ok)
                return (false, current.message, current.details);

            var currentVol = current.volume;
            var nextVol = action == "VolumeUp" ? Math.Clamp(currentVol + 5, 0, 100) : Math.Clamp(currentVol - 5, 0, 100);
            var volResult = await SetVolume(ip, nextVol);
            if (!volResult.ok)
                return (false, volResult.message, volResult.details);

            return (true, "Sonos volume changed.", new { ip, volume = nextVol, source = source ?? "unchanged" });
        }

        var payload =
            "<u:" + action + " xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">" +
            "<InstanceID>0</InstanceID>" +
            (action == "Play" ? "<Speed>1</Speed>" : "") +
            "</u:" + action + ">";

        var result = await Soap(ip, "/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1", action, payload);
        if (!result.ok)
            return (false, $"Sonos command failed: {action}", new { ip, action, result.status, response = TrimForLog(result.response) });

        return (true, "Sonos command sent.", new { ip, action, status = result.status });
    }

    public static async Task<(bool ok, string message, object details)> GetTopology(string ip)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" });

        var payload = "<u:GetZoneGroupState xmlns:u=\"urn:schemas-upnp-org:service:ZoneGroupTopology:1\"></u:GetZoneGroupState>";
        var result = await Soap(ip, "/ZoneGroupTopology/Control", "urn:schemas-upnp-org:service:ZoneGroupTopology:1", "GetZoneGroupState", payload);
        if (!result.ok)
            return (false, "Failed to read Sonos topology.", new { ip, result.status, response = TrimForLog(result.response) });

        try
        {
            var outer = XDocument.Parse(result.response);
            var value = outer.Descendants().FirstOrDefault(x => x.Name.LocalName == "ZoneGroupState")?.Value ?? string.Empty;
            if (string.IsNullOrWhiteSpace(value))
                return (true, "Topology response was empty.", new { ip, groups = Array.Empty<object>() });

            var groupsDoc = XDocument.Parse(value);
            var groups = groupsDoc
                .Descendants()
                .Where(x => x.Name.LocalName == "ZoneGroup")
                .Select(g => new
                {
                    coordinator = g.Attribute("Coordinator")?.Value ?? "",
                    id = g.Attribute("ID")?.Value ?? "",
                    members = g.Descendants()
                        .Where(m => m.Name.LocalName == "ZoneGroupMember")
                        .Select(m => new
                        {
                            uuid = m.Attribute("UUID")?.Value ?? "",
                            zoneName = m.Attribute("ZoneName")?.Value ?? "",
                            location = m.Attribute("Location")?.Value ?? "",
                            isCoordinator = string.Equals((m.Attribute("UUID")?.Value ?? ""), (g.Attribute("Coordinator")?.Value ?? ""), StringComparison.OrdinalIgnoreCase),
                        })
                        .ToArray(),
                })
                .ToArray();

            return (true, "Sonos topology loaded.", new { ip, groups });
        }
        catch (Exception ex)
        {
            return (false, "Failed to parse topology XML.", new { ip, error = ex.Message, raw = TrimForLog(result.response) });
        }
    }

    public static async Task<(bool ok, string message, object details)> GroupRooms(string coordinatorIp, List<string> memberIps)
    {
        if (string.IsNullOrWhiteSpace(coordinatorIp))
            return (false, "coordinatorIp is required.", new { coordinatorIp = "" });

        if (memberIps == null || memberIps.Count == 0)
            return (false, "memberIps is required.", new { coordinatorIp, memberIps = Array.Empty<string>() });

        var coordinatorUidResult = await GetDeviceUid(coordinatorIp);
        if (!coordinatorUidResult.ok)
            return (false, coordinatorUidResult.message, coordinatorUidResult.details);

        var coordinatorUid = coordinatorUidResult.uid;
        var errors = new List<object>();
        var grouped = new List<string>();

        foreach (var memberIp in memberIps.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (string.Equals(memberIp, coordinatorIp, StringComparison.OrdinalIgnoreCase))
                continue;

            var payload =
                "<u:SetAVTransportURI xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">" +
                "<InstanceID>0</InstanceID>" +
                "<CurrentURI>x-rincon:" + coordinatorUid + "</CurrentURI>" +
                "<CurrentURIMetaData></CurrentURIMetaData>" +
                "</u:SetAVTransportURI>";

            var result = await Soap(memberIp, "/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1", "SetAVTransportURI", payload);
            if (!result.ok)
            {
                errors.Add(new { ip = memberIp, result.status, response = TrimForLog(result.response) });
                continue;
            }

            grouped.Add(memberIp);
        }

        if (errors.Count > 0)
            return (false, "Failed to group one or more Sonos members.", new { coordinatorIp, grouped, errors });

        return (true, "Sonos rooms grouped.", new { coordinatorIp, coordinatorUid, grouped });
    }

    public static async Task<(bool ok, string message, object details)> Ungroup(string ip)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" });

        var payload = "<u:BecomeCoordinatorOfStandaloneGroup xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\"><InstanceID>0</InstanceID></u:BecomeCoordinatorOfStandaloneGroup>";
        var result = await Soap(ip, "/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1", "BecomeCoordinatorOfStandaloneGroup", payload);
        if (!result.ok)
            return (false, "Failed to ungroup Sonos room.", new { ip, result.status, response = TrimForLog(result.response) });

        return (true, "Sonos room ungrouped.", new { ip, status = result.status });
    }

    public static async Task<(bool ok, string message, object details)> GetNowPlaying(string ip)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" });

        var transportPayload =
            "<u:GetTransportInfo xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">" +
            "<InstanceID>0</InstanceID></u:GetTransportInfo>";
        var positionPayload =
            "<u:GetPositionInfo xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">" +
            "<InstanceID>0</InstanceID></u:GetPositionInfo>";

        var transport = await Soap(ip, "/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1", "GetTransportInfo", transportPayload);
        if (!transport.ok)
            return (false, "Failed to get Sonos transport info.", new { ip, transport.status, response = TrimForLog(transport.response) });

        var position = await Soap(ip, "/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1", "GetPositionInfo", positionPayload);
        if (!position.ok)
            return (false, "Failed to get Sonos position info.", new { ip, position.status, response = TrimForLog(position.response) });

        return (true, "Now playing loaded.", BuildNowPlayingPayload(ip, position.response, transport.response));
    }

    public static Task<(bool ok, string message, object details)> SetVolumeAbsolute(string ip, int volume)
    {
        return SetVolume(ip, volume);
    }

    public static async Task<(bool ok, string message, object details)> SetMute(string ip, bool muted)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" });

        var payload =
            "<u:SetMute xmlns:u=\"urn:schemas-upnp-org:service:RenderingControl:1\">" +
            "<InstanceID>0</InstanceID><Channel>Master</Channel><DesiredMute>" + (muted ? "1" : "0") + "</DesiredMute>" +
            "</u:SetMute>";
        var result = await Soap(ip, "/MediaRenderer/RenderingControl/Control", "urn:schemas-upnp-org:service:RenderingControl:1", "SetMute", payload);
        if (!result.ok)
            return (false, "Failed to set Sonos mute.", new { ip, muted, result.status, response = TrimForLog(result.response) });

        return (true, "Sonos mute updated.", new { ip, muted, status = result.status });
    }

    public static async Task<(bool ok, string message, object details)> BrowseQueue(string ip, int start, int count)
    {
        var browsed = await Browse(ip, "Q:0", start, count);
        if (!browsed.ok)
            return (false, browsed.message, browsed.details);

        return (true, "Sonos queue loaded.", browsed.details);
    }

    public static async Task<(bool ok, string message, object details)> BrowsePlaylists(string ip, int start, int count)
    {
        var containerCandidates = new[] { "SQ:", "A:PLAYLISTS", "A:ALBUMARTIST" };
        foreach (var container in containerCandidates)
        {
            var browsed = await Browse(ip, container, start, count);
            if (!browsed.ok)
                continue;

            return (true, "Sonos playlists loaded.", browsed.details);
        }

        return (false, "Failed to browse Sonos playlists.", new { ip, start, count });
    }

    public static async Task<(bool ok, string message, object details)> BrowseFavorites(string ip, int start, int count)
    {
        var containerCandidates = new[] { "FV:2", "FV:1", "A:FAVORITES" };
        foreach (var container in containerCandidates)
        {
            var browsed = await Browse(ip, container, start, count);
            if (!browsed.ok)
                continue;

            return (true, "Sonos favorites loaded.", browsed.details);
        }

        return (false, "Failed to browse Sonos favorites.", new { ip, start, count });
    }

    public static async Task<(bool ok, string message, object details)> Search(string ip, string term, int start, int count, string containerId)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" });
        if (string.IsNullOrWhiteSpace(term))
            return (false, "term is required.", new { ip, term = "" });

        var searched = await SearchContent(ip, string.IsNullOrWhiteSpace(containerId) ? "A:TRACKS" : containerId, term, start, count);
        if (searched.ok && searched.items.Count > 0)
            return (true, "Sonos search completed.", searched.details);

        // Fallback: local title contains search across favorites and playlists.
        var favorites = await BrowseFavorites(ip, 0, Math.Max(200, count));
        var playlists = await BrowsePlaylists(ip, 0, Math.Max(200, count));

        var fallbackItems = new List<object>();
        void AppendFrom(object details, string source)
        {
            var json = JsonSerializer.Serialize(details);
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("items", out var arr) || arr.ValueKind != JsonValueKind.Array) return;
            foreach (var item in arr.EnumerateArray())
            {
                var title = item.TryGetProperty("title", out var t) ? (t.GetString() ?? "") :
                    (item.TryGetProperty("Title", out var t2) ? (t2.GetString() ?? "") : "");
                if (title.IndexOf(term, StringComparison.OrdinalIgnoreCase) < 0) continue;
                var id = item.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") :
                    (item.TryGetProperty("Id", out var idEl2) ? (idEl2.GetString() ?? "") : "");
                var uri = item.TryGetProperty("uri", out var uriEl) ? (uriEl.GetString() ?? "") :
                    (item.TryGetProperty("Uri", out var uriEl2) ? (uriEl2.GetString() ?? "") : "");
                fallbackItems.Add(new { id, title, uri, source });
            }
        }

        if (favorites.ok) AppendFrom(favorites.details, "favorites");
        if (playlists.ok) AppendFrom(playlists.details, "playlists");

        var page = fallbackItems.Skip(Math.Max(0, start)).Take(Math.Max(1, count)).ToArray();
        return (true, "Sonos fallback search completed.", new
        {
            ip,
            term,
            containerId,
            total = fallbackItems.Count,
            start,
            count,
            items = page,
            mode = "fallback-title-contains",
        });
    }

    public static async Task<(bool ok, string message, object details)> PlayFavorite(string ip, string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return (false, "title is required.", new { ip, title = "" });

        var browsed = await BrowseFavorites(ip, 0, 500);
        if (!browsed.ok)
            return (false, browsed.message, browsed.details);

        var selected = ExtractMatchByTitle(browsed.details, title);
        if (!selected.ok)
            return (false, "Favorite not found.", new { ip, title });

        var setUri = await SetAvTransportUri(ip, selected.uri, selected.itemXml);
        if (!setUri.ok)
            return (false, setUri.message, setUri.details);

        var playPayload = "<u:Play xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\"><InstanceID>0</InstanceID><Speed>1</Speed></u:Play>";
        var play = await Soap(ip, "/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1", "Play", playPayload);
        if (!play.ok)
            return (false, "Failed to start favorite.", new { ip, title, play.status, response = TrimForLog(play.response) });

        return (true, "Sonos favorite started.", new { ip, title = selected.title, uri = selected.uri });
    }

    public static async Task<(bool ok, string message, object details)> PlayPlaylist(string ip, string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return (false, "title is required.", new { ip, title = "" });

        var browsed = await BrowsePlaylists(ip, 0, 500);
        if (!browsed.ok)
            return (false, browsed.message, browsed.details);

        var selected = ExtractMatchByTitle(browsed.details, title);
        if (!selected.ok)
            return (false, "Playlist not found.", new { ip, title });

        var playlistUri = selected.uri;
        // Sonos saved queue items often return file:// URI and need queue URI form.
        if (playlistUri.StartsWith("file:///jffs/settings/savedqueues.rsq#", StringComparison.OrdinalIgnoreCase))
        {
            var uidResult = await GetDeviceUid(ip);
            if (!uidResult.ok)
                return (false, uidResult.message, uidResult.details);

            var hashIndex = playlistUri.LastIndexOf('#');
            var queueSuffix = hashIndex >= 0 ? playlistUri.Substring(hashIndex) : "";
            playlistUri = "x-rincon-queue:" + uidResult.uid + queueSuffix;
        }

        var setUri = await SetAvTransportUri(ip, playlistUri, selected.itemXml);
        if (!setUri.ok)
            return (false, setUri.message, setUri.details);

        var playPayload = "<u:Play xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\"><InstanceID>0</InstanceID><Speed>1</Speed></u:Play>";
        var play = await Soap(ip, "/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1", "Play", playPayload);
        if (!play.ok)
            return (false, "Failed to start playlist.", new { ip, title, play.status, response = TrimForLog(play.response) });

        return (true, "Sonos playlist started.", new { ip, title = selected.title, uri = playlistUri });
    }

    static async Task<(bool ok, string message, object details, List<SonosDidlItem> items)> Browse(string ip, string objectId, int start, int count)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" }, new List<SonosDidlItem>());

        var payload =
            "<u:Browse xmlns:u=\"urn:schemas-upnp-org:service:ContentDirectory:1\">" +
            "<ObjectID>" + SecurityElement.Escape(objectId) + "</ObjectID>" +
            "<BrowseFlag>BrowseDirectChildren</BrowseFlag>" +
            "<Filter>*</Filter>" +
            "<StartingIndex>" + Math.Max(0, start) + "</StartingIndex>" +
            "<RequestedCount>" + Math.Max(1, count) + "</RequestedCount>" +
            "<SortCriteria></SortCriteria>" +
            "</u:Browse>";

        var result = await Soap(ip, "/MediaServer/ContentDirectory/Control", "urn:schemas-upnp-org:service:ContentDirectory:1", "Browse", payload);
        if (!result.ok)
            return (false, "Sonos browse failed.", new { ip, objectId, result.status, response = TrimForLog(result.response) }, new List<SonosDidlItem>());

        var didl = SoapDecodeInnerXml(result.response, "Result");
        var items = ParseDidlItems(didl);
        var totalMatches = SoapDecodeInnerXml(result.response, "TotalMatches");
        var numberReturned = SoapDecodeInnerXml(result.response, "NumberReturned");

        var details = new
        {
            ip,
            objectId,
            start,
            count,
            totalMatches,
            numberReturned,
            items = items.Select(x => new { x.Id, x.Title, x.Uri, x.ItemXml }).ToArray(),
        };
        return (true, "Sonos browse completed.", details, items);
    }

    static async Task<(bool ok, string message, object details, List<SonosDidlItem> items)> SearchContent(string ip, string containerId, string term, int start, int count)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" }, new List<SonosDidlItem>());
        if (string.IsNullOrWhiteSpace(term))
            return (false, "term is required.", new { ip, term = "" }, new List<SonosDidlItem>());

        var criteria = "dc:title contains \"" + SecurityElement.Escape(term) + "\"";
        var payload =
            "<u:Search xmlns:u=\"urn:schemas-upnp-org:service:ContentDirectory:1\">" +
            "<ContainerID>" + SecurityElement.Escape(containerId) + "</ContainerID>" +
            "<SearchCriteria>" + criteria + "</SearchCriteria>" +
            "<Filter>*</Filter>" +
            "<StartingIndex>" + Math.Max(0, start) + "</StartingIndex>" +
            "<RequestedCount>" + Math.Max(1, count) + "</RequestedCount>" +
            "<SortCriteria></SortCriteria>" +
            "</u:Search>";

        var result = await Soap(ip, "/MediaServer/ContentDirectory/Control", "urn:schemas-upnp-org:service:ContentDirectory:1", "Search", payload);
        if (!result.ok)
            return (false, "Sonos search failed.", new { ip, containerId, term, result.status, response = TrimForLog(result.response) }, new List<SonosDidlItem>());

        var didl = SoapDecodeInnerXml(result.response, "Result");
        var items = ParseDidlItems(didl);
        var totalMatches = SoapDecodeInnerXml(result.response, "TotalMatches");
        var numberReturned = SoapDecodeInnerXml(result.response, "NumberReturned");

        var details = new
        {
            ip,
            containerId,
            term,
            start,
            count,
            totalMatches,
            numberReturned,
            items = items.Select(x => new { x.Id, x.Title, x.Uri, x.ItemXml }).ToArray(),
        };
        return (true, "Sonos search completed.", details, items);
    }

    static List<SonosDidlItem> ParseDidlItems(string didl)
    {
        var result = new List<SonosDidlItem>();
        if (string.IsNullOrWhiteSpace(didl))
            return result;

        try
        {
            var doc = XDocument.Parse(didl);
            foreach (var node in doc.Descendants().Where(x => x.Name.LocalName == "item" || x.Name.LocalName == "container"))
            {
                var id = node.Attribute("id")?.Value ?? "";
                var title = node.Descendants().FirstOrDefault(x => x.Name.LocalName == "title")?.Value ?? "";
                var uri = node.Descendants().FirstOrDefault(x => x.Name.LocalName == "res")?.Value ?? "";
                result.Add(new SonosDidlItem
                {
                    Id = id,
                    Title = title,
                    Uri = uri,
                    ItemXml = node.ToString(SaveOptions.DisableFormatting),
                });
            }
        }
        catch
        {
            return new List<SonosDidlItem>();
        }

        return result;
    }

    static async Task<(bool ok, string message, object details)> SetAvTransportUri(string ip, string uri, string meta)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "ip is required.", new { ip = "" });

        var payload =
            "<u:SetAVTransportURI xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">" +
            "<InstanceID>0</InstanceID>" +
            "<CurrentURI>" + SecurityElement.Escape(uri) + "</CurrentURI>" +
            "<CurrentURIMetaData>" + SecurityElement.Escape(meta) + "</CurrentURIMetaData>" +
            "</u:SetAVTransportURI>";

        var result = await Soap(ip, "/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1", "SetAVTransportURI", payload);
        if (!result.ok)
            return (false, "Failed to set Sonos transport URI.", new { ip, uri, result.status, response = TrimForLog(result.response) });

        return (true, "Sonos transport URI set.", new { ip, uri, status = result.status });
    }

    static object BuildNowPlayingPayload(string ip, string positionInfoXml, string transportInfoXml)
    {
        string trackUri = SoapDecodeInnerXml(positionInfoXml, "TrackURI");
        string trackMeta = SoapDecodeInnerXml(positionInfoXml, "TrackMetaData");
        string trackDuration = SoapDecodeInnerXml(positionInfoXml, "TrackDuration");
        string relTime = SoapDecodeInnerXml(positionInfoXml, "RelTime");
        string state = SoapDecodeInnerXml(transportInfoXml, "CurrentTransportState");
        var didlItems = ParseDidlItems(trackMeta);
        var first = didlItems.FirstOrDefault();

        return new
        {
            ip,
            state,
            track = new
            {
                title = first?.Title ?? "",
                uri = string.IsNullOrWhiteSpace(trackUri) ? (first?.Uri ?? "") : trackUri,
                id = first?.Id ?? "",
                duration = trackDuration,
                position = relTime,
            }
        };
    }

    static string SoapDecodeInnerXml(string xml, string elementName)
    {
        if (string.IsNullOrWhiteSpace(xml) || string.IsNullOrWhiteSpace(elementName))
            return "";

        try
        {
            var doc = XDocument.Parse(xml);
            var el = doc.Descendants().FirstOrDefault(x => x.Name.LocalName == elementName);
            return el?.Value ?? "";
        }
        catch
        {
            return "";
        }
    }

    static (bool ok, string title, string uri, string itemXml) ExtractMatchByTitle(object details, string title)
    {
        var json = JsonSerializer.Serialize(details);
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("items", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return (false, "", "", "");

        foreach (var item in arr.EnumerateArray())
        {
            var itemTitle = item.TryGetProperty("Title", out var titleEl) ? (titleEl.GetString() ?? "") :
                (item.TryGetProperty("title", out var titleLowerEl) ? (titleLowerEl.GetString() ?? "") : "");
            if (itemTitle.IndexOf(title, StringComparison.OrdinalIgnoreCase) < 0)
                continue;

            var uri = item.TryGetProperty("Uri", out var uriEl) ? (uriEl.GetString() ?? "") :
                (item.TryGetProperty("uri", out var uriLowerEl) ? (uriLowerEl.GetString() ?? "") : "");
            var itemXml = item.TryGetProperty("ItemXml", out var xmlEl) ? (xmlEl.GetString() ?? "") :
                (item.TryGetProperty("itemXml", out var xmlLowerEl) ? (xmlLowerEl.GetString() ?? "") : "");

            return (true, itemTitle, uri, itemXml);
        }

        return (false, "", "", "");
    }

    static async Task<(bool ok, int status, string response)> Soap(string ip, string path, string service, string action, string bodyInner)
    {
        var envelope =
            "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
            "<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">" +
            "<s:Body>" + bodyInner + "</s:Body></s:Envelope>";

        var req = new HttpRequestMessage(HttpMethod.Post, $"http://{ip}:1400{path}");
        req.Headers.TryAddWithoutValidation("SOAPACTION", $"\"{service}#{action}\"");
        req.Content = new StringContent(envelope, Encoding.UTF8, "text/xml");

        try
        {
            var resp = await _http.SendAsync(req);
            var text = await resp.Content.ReadAsStringAsync();
            return (resp.IsSuccessStatusCode, (int)resp.StatusCode, text);
        }
        catch (Exception ex)
        {
            return (false, 0, "HTTP error: " + ex.Message);
        }
    }

    static async Task<(bool ok, string uid, string message, object details)> GetDeviceUid(string ip)
    {
        if (string.IsNullOrWhiteSpace(ip))
            return (false, "", "ip is required.", new { ip = "" });

        try
        {
            var xml = await _http.GetStringAsync($"http://{ip}:1400/xml/device_description.xml");
            var doc = XDocument.Parse(xml);
            var udn = doc.Descendants().FirstOrDefault(x => x.Name.LocalName == "UDN")?.Value ?? string.Empty;
            var uid = udn.Replace("uuid:", "", StringComparison.OrdinalIgnoreCase).Trim();
            if (string.IsNullOrWhiteSpace(uid))
                return (false, "", "Unable to resolve Sonos UID.", new { ip, udn = TrimForLog(udn) });

            return (true, uid, "ok", new { ip, uid });
        }
        catch (Exception ex)
        {
            return (false, "", "Failed to read Sonos device description.", new { ip, error = ex.Message });
        }
    }

    static async Task<(bool ok, int volume, string message, object details)> GetVolume(string ip)
    {
        var payload =
            "<u:GetVolume xmlns:u=\"urn:schemas-upnp-org:service:RenderingControl:1\">" +
            "<InstanceID>0</InstanceID><Channel>Master</Channel></u:GetVolume>";
        var result = await Soap(ip, "/MediaRenderer/RenderingControl/Control", "urn:schemas-upnp-org:service:RenderingControl:1", "GetVolume", payload);
        if (!result.ok)
            return (false, 0, "Failed to get Sonos volume.", new { ip, result.status, response = TrimForLog(result.response) });

        try
        {
            var doc = XDocument.Parse(result.response);
            var val = doc.Descendants().FirstOrDefault(x => x.Name.LocalName == "CurrentVolume")?.Value ?? "0";
            if (!int.TryParse(val, out var volume)) volume = 0;
            return (true, Math.Clamp(volume, 0, 100), "ok", new { ip, volume = Math.Clamp(volume, 0, 100) });
        }
        catch
        {
            return (false, 0, "Failed to parse Sonos volume response.", new { ip, raw = result.response });
        }
    }

    static async Task<(bool ok, string message, object details)> SetVolume(string ip, int volume)
    {
        var payload =
            "<u:SetVolume xmlns:u=\"urn:schemas-upnp-org:service:RenderingControl:1\">" +
            "<InstanceID>0</InstanceID><Channel>Master</Channel><DesiredVolume>" + Math.Clamp(volume, 0, 100) + "</DesiredVolume>" +
            "</u:SetVolume>";
        var result = await Soap(ip, "/MediaRenderer/RenderingControl/Control", "urn:schemas-upnp-org:service:RenderingControl:1", "SetVolume", payload);
        if (!result.ok)
            return (false, "Failed to set Sonos volume.", new { ip, volume, result.status, response = TrimForLog(result.response) });

        return (true, "Sonos volume set.", new { ip, volume = Math.Clamp(volume, 0, 100), status = result.status });
    }

    static async Task<(bool ok, string message, object details)> SetSource(string ip, string source)
    {
        // Accept direct URI source strings so control can target Sonos playlists, line-in, or streams.
        var uri = source;
        if (!uri.Contains(':'))
            uri = "x-rincon-queue:" + source;

        var payload =
            "<u:SetAVTransportURI xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">" +
            "<InstanceID>0</InstanceID>" +
            "<CurrentURI>" + SecurityElement.Escape(uri) + "</CurrentURI>" +
            "<CurrentURIMetaData></CurrentURIMetaData>" +
            "</u:SetAVTransportURI>";

        var result = await Soap(ip, "/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1", "SetAVTransportURI", payload);
        if (!result.ok)
            return (false, "Failed to set Sonos source URI.", new { ip, source = uri, result.status, response = TrimForLog(result.response) });

        return (true, "Sonos source set.", new { ip, source = uri, status = result.status });
    }

    static string TrimForLog(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        value = value.Replace("\r", "").Trim();
        const int max = 1200;
        return value.Length <= max ? value : value[..max] + "...";
    }
}

/// <summary>
/// Server-side simulation state for the debug panel.
/// Builds mock signal data from SystemConfig + JoinContract, with a ring buffer log.
/// </summary>
static class SimulationEngine
{
    static readonly ConcurrentDictionary<string, object?> _values = new();
    static readonly ConcurrentQueue<LogEntry> _logs = new();
    const int MaxLogs = 1000;

    public static void LogAndBuffer(string level, string source, string message)
    {
        var entry = new LogEntry
        {
            time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            level = level,
            source = source,
            message = message,
        };
        _logs.Enqueue(entry);
        while (_logs.Count > MaxLogs) _logs.TryDequeue(out _);
    }

    public static List<object> BuildSignals(string configJson)
    {
        var contract = JoinContractBuilder.Build(configJson);
        var signals = new List<object>();

        // Extract rooms from contract
        var contractJson = JsonSerializer.Serialize(contract);
        using var doc = JsonDocument.Parse(contractJson);
        var root = doc.RootElement;

        if (root.TryGetProperty("rooms", out var roomsEl) && roomsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var room in roomsEl.EnumerateArray())
            {
                var roomId = room.GetProperty("id").GetString()!;
                var roomName = room.GetProperty("name").GetString()!;

                if (room.TryGetProperty("joins", out var joins))
                {
                    foreach (var joinType in new[] { "digital", "analog", "serial" })
                    {
                        if (joins.TryGetProperty(joinType, out var joinsArr))
                        {
                            foreach (var j in joinsArr.EnumerateArray())
                            {
                                var joinNum = j.GetProperty("join").GetInt32();
                                var name = j.GetProperty("name").GetString()!;
                                var direction = j.GetProperty("direction").GetString()!;
                                var key = $"{joinType}:{roomId}:{joinNum}";

                                object? value = null;
                                if (_values.TryGetValue(key, out var storedVal))
                                {
                                    value = storedVal;
                                }
                                else
                                {
                                    value = joinType switch
                                    {
                                        "digital" => (object)false,
                                        "analog" => 0,
                                        "serial" => "",
                                        _ => null,
                                    };
                                }

                                signals.Add(new
                                {
                                    key,
                                    type = joinType,
                                    joinNumber = joinNum,
                                    direction,
                                    roomId,
                                    roomName,
                                    name,
                                    value,
                                });
                            }
                        }
                    }
                }
            }
        }

        // System joins
        if (root.TryGetProperty("system", out var sysEl))
        {
            foreach (var joinType in new[] { "digital", "serial" })
            {
                if (sysEl.TryGetProperty(joinType, out var joinsArr))
                {
                    foreach (var j in joinsArr.EnumerateArray())
                    {
                        var joinNum = j.GetProperty("join").GetInt32();
                        var name = j.GetProperty("name").GetString()!;
                        var direction = j.GetProperty("direction").GetString()!;
                        var key = $"{joinType}:system:{joinNum}";

                        object? value = null;
                        if (_values.TryGetValue(key, out var storedVal))
                        {
                            value = storedVal;
                        }
                        else
                        {
                            value = joinType switch
                            {
                                "digital" => (object)false,
                                "serial" => "",
                                _ => null,
                            };
                        }

                        signals.Add(new
                        {
                            key,
                            type = joinType,
                            joinNumber = joinNum,
                            direction,
                            roomId = "system",
                            roomName = "System",
                            name,
                            value,
                        });
                    }
                }
            }
        }

        return signals;
    }

    public static List<object> BuildConnections(string configJson)
    {
        using var doc = JsonDocument.Parse(configJson);
        var root = doc.RootElement;
        var connections = new List<object>();

        JsonElement processorsEl = default;
        var hasProcessors = root.TryGetProperty("system", out var systemEl)
            && systemEl.TryGetProperty("processors", out processorsEl)
            && processorsEl.ValueKind == JsonValueKind.Array;

        if (hasProcessors)
        {
            foreach (var proc in processorsEl.EnumerateArray())
            {
                var procId = proc.GetProperty("id").GetString()!;
                var eiscIpId = proc.TryGetProperty("eiscIpId", out var eid) ? eid.GetString() : "";
                var eiscAddr = proc.TryGetProperty("eiscIpAddress", out var eaddr) ? eaddr.GetString() : "";
                var procType = proc.TryGetProperty("processor", out var pt) ? pt.GetString() : "CP4";

                // Count signals for this processor
                int digitalCount = 0, analogCount = 0, serialCount = 0;
                if (root.TryGetProperty("rooms", out var roomsEl))
                {
                    foreach (var room in roomsEl.EnumerateArray())
                    {
                        var roomProcId = room.TryGetProperty("processorId", out var rp) ? rp.GetString() : "main";
                        if (string.Equals(roomProcId, procId, StringComparison.OrdinalIgnoreCase))
                        {
                            digitalCount += 71; // based on JoinContractBuilder RoomDigital count
                            analogCount += 9;
                            serialCount += 8;
                        }
                    }
                }

                connections.Add(new
                {
                    processorId = procId,
                    processorType = procType,
                    eiscIpId,
                    eiscIpAddress = eiscAddr,
                    online = true, // simulated
                    digitalSignals = digitalCount,
                    analogSignals = analogCount,
                    serialSignals = serialCount,
                });
            }
        }
        else
        {
            // Single processor
            string? eiscIpId = "0x03";
            string? eiscAddr = "127.0.0.2";
            if (root.TryGetProperty("system", out var sys))
            {
                if (sys.TryGetProperty("eiscIpId", out var eid)) eiscIpId = eid.GetString();
                if (sys.TryGetProperty("eiscIpAddress", out var eaddr)) eiscAddr = eaddr.GetString();
            }
            var roomCount = root.TryGetProperty("rooms", out var rooms) ? rooms.GetArrayLength() : 0;

            connections.Add(new
            {
                processorId = "main",
                processorType = "CP4",
                eiscIpId,
                eiscIpAddress = eiscAddr,
                online = true,
                digitalSignals = roomCount * 71,
                analogSignals = roomCount * 9,
                serialSignals = roomCount * 8,
            });
        }

        return connections;
    }

    public static List<object> GetLogs(string? levelFilter, long sinceTs, int limit)
    {
        var entries = _logs.ToArray().AsEnumerable();

        if (!string.IsNullOrEmpty(levelFilter))
        {
            entries = entries.Where(e => string.Equals(e.level, levelFilter, StringComparison.OrdinalIgnoreCase));
        }
        if (sinceTs > 0)
        {
            entries = entries.Where(e => e.time > sinceTs);
        }

        return entries
            .OrderByDescending(e => e.time)
            .Take(limit)
            .Select(e => (object)new { e.time, e.level, e.source, e.message })
            .ToList();
    }

    public static object BuildJoinValues(string configJson)
    {
        using var doc = JsonDocument.Parse(configJson);
        var root = doc.RootElement;
        var result = new Dictionary<string, object>();

        if (root.TryGetProperty("rooms", out var roomsEl) && roomsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var room in roomsEl.EnumerateArray())
            {
                var roomId = room.GetProperty("id").GetString()!;
                var roomValues = new Dictionary<string, object?>();

                var offset = room.GetProperty("joinOffset").GetInt32();
                // Collect any stored values for this room
                foreach (var kvp in _values)
                {
                    if (kvp.Key.Contains($":{roomId}:"))
                    {
                        roomValues[kvp.Key] = kvp.Value;
                    }
                }

                result[roomId] = new
                {
                    roomId,
                    joinOffset = offset,
                    values = roomValues,
                };
            }
        }

        return result;
    }

    public static void SetJoinValue(string type, int join, JsonElement value)
    {
        // Find which room this join belongs to based on stored state
        // Store with a generic key since we don't know the room from just type+join
        var key = $"{type}:manual:{join}";

        object? parsed = type switch
        {
            "digital" => value.ValueKind == JsonValueKind.True ? (object)true
                : value.ValueKind == JsonValueKind.False ? false
                : value.ValueKind == JsonValueKind.Number ? value.GetInt32() != 0
                : false,
            "analog" => value.ValueKind == JsonValueKind.Number ? (object)value.GetInt32() : 0,
            "serial" => value.ValueKind == JsonValueKind.String ? (object)(value.GetString() ?? "") : "",
            _ => null,
        };

        _values[key] = parsed;
    }

    public static void Reset()
    {
        _values.Clear();
        while (_logs.TryDequeue(out _)) { }
    }

    class LogEntry
    {
        public long time { get; set; }
        public string level { get; set; } = "info";
        public string source { get; set; } = "";
        public string message { get; set; } = "";
    }
}

/// <summary>
/// Manages SFTP deployments to Crestron CP4 processors.
/// Uses SSH.NET for file transfer, follows the NetworkScanner pattern
/// (ConcurrentDictionary state, background Task.Run, polling for status).
/// Credentials are never stored in state — only held in-memory during the SFTP session.
/// </summary>
static class DeploymentManager
{
    static readonly ConcurrentDictionary<string, DeployState> _deploys = new();
    static int _activeDeployCount;

    public static async Task<object> TestAuth(string ip, int port, string username, string password)
    {
        try
        {
            var connectionInfo = new Renci.SshNet.ConnectionInfo(ip, port, username,
                new PasswordAuthenticationMethod(username, password))
            {
                Timeout = TimeSpan.FromSeconds(10),
            };

            using var sftp = new SftpClient(connectionInfo);
            await Task.Run(() => sftp.Connect());

            string serverInfo = sftp.ConnectionInfo.ServerVersion ?? "Unknown";
            // Verify we can list /User/
            var files = sftp.ListDirectory("/User");
            var fileCount = files.Count();
            sftp.Disconnect();

            return new { success = true, serverInfo, message = $"Authenticated. /User/ contains {fileCount} items." };
        }
        catch (Exception ex)
        {
            return new { success = false, serverInfo = (string?)null, message = ex.Message };
        }
    }

    public static async Task<(List<object>? files, string? error)> PreviewFiles(
        string systemConfigPath, string joinListPath, SemaphoreSlim fileLock)
    {
        if (!File.Exists(systemConfigPath))
        {
            return (null, "SystemConfig not found. Save your configuration first.");
        }

        try
        {
            await fileLock.WaitAsync();
            string configJson;
            try { configJson = await File.ReadAllTextAsync(systemConfigPath); }
            finally { fileLock.Release(); }

            // Generate JoinList from config
            var joinListJson = GenerateJoinListJson(configJson);
            // Generate JoinContract from config
            var contract = JoinContractBuilder.Build(configJson);
            var contractJson = JsonSerializer.Serialize(contract, new JsonSerializerOptions { WriteIndented = true });

            var files = new List<object>
            {
                BuildFilePreview("SystemConfig.json", "/User/SystemConfig.json", configJson),
                BuildFilePreview("JoinList.json", "/User/JoinList.json", joinListJson),
                BuildFilePreview("JoinContract.json", "/User/JoinContract.json", contractJson),
            };

            return (files, null);
        }
        catch (Exception ex)
        {
            return (null, $"Failed to preview files: {ex.Message}");
        }
    }

    public static string? StartDeploy(string ip, int port, string username, string password,
        string systemConfigPath, string joinListPath, SemaphoreSlim fileLock, ILogger logger)
    {
        if (Interlocked.CompareExchange(ref _activeDeployCount, 0, 0) >= 1)
        {
            return null; // Only 1 concurrent deployment
        }

        var deployId = Guid.NewGuid().ToString("N")[..12];
        var state = new DeployState
        {
            Id = deployId,
            Status = "preparing",
            StartedAt = DateTime.UtcNow,
        };
        _deploys[deployId] = state;
        Interlocked.Increment(ref _activeDeployCount);

        _ = Task.Run(async () =>
        {
            try
            {
                // Step 1: Read files locally
                await fileLock.WaitAsync(state.Cts.Token);
                string configJson;
                try { configJson = await File.ReadAllTextAsync(systemConfigPath); }
                finally { fileLock.Release(); }

                if (state.Cts.IsCancellationRequested) { state.Status = "cancelled"; return; }

                var joinListJson = GenerateJoinListJson(configJson);
                var contract = JoinContractBuilder.Build(configJson);
                var contractJson = JsonSerializer.Serialize(contract, new JsonSerializerOptions { WriteIndented = true });

                // Build file list
                var filesToUpload = new[]
                {
                    new FileToUpload("SystemConfig.json", "/User/SystemConfig.json", configJson),
                    new FileToUpload("JoinList.json", "/User/JoinList.json", joinListJson),
                    new FileToUpload("JoinContract.json", "/User/JoinContract.json", contractJson),
                };

                foreach (var f in filesToUpload)
                {
                    state.Files.TryAdd(f.Name, new FileTransferState
                    {
                        Name = f.Name,
                        RemotePath = f.RemotePath,
                        TotalBytes = Encoding.UTF8.GetByteCount(f.Content),
                        Status = "pending",
                    });
                }

                if (state.Cts.IsCancellationRequested) { state.Status = "cancelled"; return; }

                // Step 2: Connect SFTP
                state.Status = "transferring";
                var connectionInfo = new Renci.SshNet.ConnectionInfo(ip, port, username,
                    new PasswordAuthenticationMethod(username, password))
                {
                    Timeout = TimeSpan.FromSeconds(15),
                };

                using var sftp = new SftpClient(connectionInfo);
                sftp.Connect();

                // Ensure /User/ directory exists
                try { sftp.CreateDirectory("/User"); } catch { /* already exists */ }

                // Step 3: Upload each file
                foreach (var f in filesToUpload)
                {
                    if (state.Cts.IsCancellationRequested) { state.Status = "cancelled"; sftp.Disconnect(); return; }

                    var fState = state.Files[f.Name];
                    fState.Status = "transferring";

                    try
                    {
                        var bytes = Encoding.UTF8.GetBytes(f.Content);
                        using var stream = new MemoryStream(bytes);
                        sftp.UploadFile(stream, f.RemotePath, canOverride: true, uploadCallback: (uploaded) =>
                        {
                            fState.BytesTransferred = (long)uploaded;
                        });
                        fState.BytesTransferred = fState.TotalBytes;
                        fState.Status = "done";
                    }
                    catch (Exception ex)
                    {
                        fState.Status = "error";
                        fState.Error = ex.Message;
                        throw;
                    }
                }

                sftp.Disconnect();
                state.Status = "completed";
                state.CompletedAt = DateTime.UtcNow;
                logger.LogInformation("Deployment {Id} completed successfully.", deployId);
            }
            catch (OperationCanceledException)
            {
                state.Status = "cancelled";
            }
            catch (Exception ex)
            {
                state.Status = "error";
                state.Error = ex.Message;
                logger.LogError(ex, "Deployment {Id} failed.", deployId);
            }
            finally
            {
                Interlocked.Decrement(ref _activeDeployCount);
                // Auto-cleanup after 30 min
                _ = Task.Delay(TimeSpan.FromMinutes(30)).ContinueWith(t => { _deploys.TryRemove(deployId, out var removed); });
            }
        });

        return deployId;
    }

    public static object? GetStatus(string deployId)
    {
        if (!_deploys.TryGetValue(deployId, out var state)) return null;

        var files = state.Files.Values.Select(f => new
        {
            name = f.Name,
            remotePath = f.RemotePath,
            totalBytes = f.TotalBytes,
            bytesTransferred = f.BytesTransferred,
            status = f.Status,
            error = f.Error,
        }).ToList();

        long totalBytes = files.Sum(f => f.totalBytes);
        long transferred = files.Sum(f => f.bytesTransferred);
        int progress = totalBytes > 0 ? (int)(transferred * 100 / totalBytes) : 0;

        return new
        {
            id = state.Id,
            status = state.Status,
            progress,
            files,
            error = state.Error,
            startedAt = state.StartedAt.ToString("o"),
            completedAt = state.CompletedAt?.ToString("o"),
        };
    }

    public static bool Cancel(string deployId)
    {
        if (!_deploys.TryGetValue(deployId, out var state)) return false;
        state.Cts.Cancel();
        state.Status = "cancelled";
        return true;
    }

    public static async Task<object?> Verify(string deployId, string ip, int port, string username, string password)
    {
        if (!_deploys.TryGetValue(deployId, out var state)) return null;

        try
        {
            var connectionInfo = new Renci.SshNet.ConnectionInfo(ip, port, username,
                new PasswordAuthenticationMethod(username, password))
            {
                Timeout = TimeSpan.FromSeconds(10),
            };

            using var sftp = new SftpClient(connectionInfo);
            await Task.Run(() => sftp.Connect());

            var results = new List<object>();
            foreach (var f in state.Files.Values)
            {
                bool exists = false;
                long remoteSize = 0;
                try
                {
                    var attrs = sftp.GetAttributes(f.RemotePath);
                    exists = true;
                    remoteSize = attrs.Size;
                }
                catch { /* file not found */ }

                results.Add(new
                {
                    name = f.Name,
                    remotePath = f.RemotePath,
                    exists,
                    expectedSize = f.TotalBytes,
                    remoteSize,
                    sizeMatch = exists && remoteSize == f.TotalBytes,
                });
            }

            sftp.Disconnect();
            return new { success = results.All(r => ((dynamic)r).exists && ((dynamic)r).sizeMatch), files = results };
        }
        catch (Exception ex)
        {
            return new { success = false, files = Array.Empty<object>(), error = ex.Message };
        }
    }

    public static async Task<object> RestartProgram(string ip, string username, string password, ILogger logger)
    {
        // First attempt: SSH command execution (works on hardened processors where CTP is blocked)
        try
        {
            var sshInfo = new Renci.SshNet.ConnectionInfo(ip, 22, username,
                new Renci.SshNet.PasswordAuthenticationMethod(username, password))
            {
                Timeout = TimeSpan.FromSeconds(10),
            };

            using var ssh = new SshClient(sshInfo);
            await Task.Run(() => ssh.Connect());
            var cmd = ssh.CreateCommand("progreset -p:01");
            await Task.Run(() => cmd.Execute());
            var output = (cmd.Result ?? string.Empty).Trim();
            var error = (cmd.Error ?? string.Empty).Trim();
            ssh.Disconnect();

            logger.LogInformation("Program restart over SSH sent to {Ip}. Output: {Output} Error: {Error}", ip, output, error);
            return new { success = true, output = string.IsNullOrWhiteSpace(output) ? "progreset command sent over SSH" : output, transport = "ssh", error };
        }
        catch (Exception sshEx)
        {
            logger.LogWarning(sshEx, "SSH restart path failed for {Ip}, falling back to CTP.", ip);
        }

        // Fallback: CTP console socket
        try
        {
            // CTP console port on Crestron processors
            const int ctpPort = 41795;
            using var client = new TcpClient();
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await client.ConnectAsync(IPAddress.Parse(ip), ctpPort, cts.Token);

            using var stream = client.GetStream();
            stream.ReadTimeout = 5000;
            stream.WriteTimeout = 5000;

            // Read initial banner
            var buffer = new byte[4096];
            await Task.Delay(500);
            if (stream.DataAvailable)
            {
                await stream.ReadAsync(buffer, 0, buffer.Length);
            }

            // Send authentication if needed — CP4 CTP uses the same credentials
            var authCmd = $"{username}\r\n";
            await stream.WriteAsync(Encoding.ASCII.GetBytes(authCmd));
            await Task.Delay(300);
            if (stream.DataAvailable)
            {
                await stream.ReadAsync(buffer, 0, buffer.Length);
            }

            var passCmd = $"{password}\r\n";
            await stream.WriteAsync(Encoding.ASCII.GetBytes(passCmd));
            await Task.Delay(500);
            if (stream.DataAvailable)
            {
                await stream.ReadAsync(buffer, 0, buffer.Length);
            }

            // Send program reset command
            var cmd = "progreset -p:01\r\n";
            await stream.WriteAsync(Encoding.ASCII.GetBytes(cmd));
            await Task.Delay(1000);

            string response = "";
            if (stream.DataAvailable)
            {
                var read = await stream.ReadAsync(buffer, 0, buffer.Length);
                response = Encoding.ASCII.GetString(buffer, 0, read);
            }

            logger.LogInformation("Program restart sent to {Ip}. Response: {Response}", ip, response.Trim());
            return new { success = true, output = response.Trim(), transport = "ctp" };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to restart program on {Ip}.", ip);
            return new { success = false, output = ex.Message };
        }
    }

    public static async Task<object> ExecuteSshCommand(string ip, int port, string username, string password, string command, ILogger logger)
    {
        try
        {
            var sshInfo = new Renci.SshNet.ConnectionInfo(ip, port, username,
                new Renci.SshNet.PasswordAuthenticationMethod(username, password))
            {
                Timeout = TimeSpan.FromSeconds(12),
            };

            using var ssh = new SshClient(sshInfo);
            await Task.Run(() => ssh.Connect());
            var cmd = ssh.CreateCommand(command);
            await Task.Run(() => cmd.Execute());
            var output = (cmd.Result ?? string.Empty).Trim();
            var error = (cmd.Error ?? string.Empty).Trim();
            var exitCode = cmd.ExitStatus;
            ssh.Disconnect();

            logger.LogInformation("SSH command on {Ip}: {Command}; exit={ExitCode}", ip, command, exitCode);
            return new
            {
                success = true,
                command,
                exitCode,
                output,
                error,
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SSH command failed on {Ip}: {Command}", ip, command);
            return new
            {
                success = false,
                command,
                output = string.Empty,
                error = ex.Message,
            };
        }
    }

    public static async Task<object> CloneProgramSlot(
        string sourceIp, int sourcePort, string sourceUsername, string sourcePassword, int sourceSlot,
        string targetIp, int targetPort, string targetUsername, string targetPassword, int targetSlot,
        ILogger logger)
    {
        var sourceDir = $"/Program{sourceSlot:00}";
        var targetDir = $"/program{targetSlot:00}";

        try
        {
            var srcConn = new Renci.SshNet.ConnectionInfo(sourceIp, sourcePort, sourceUsername,
                new PasswordAuthenticationMethod(sourceUsername, sourcePassword))
            {
                Timeout = TimeSpan.FromSeconds(15),
            };
            var dstConn = new Renci.SshNet.ConnectionInfo(targetIp, targetPort, targetUsername,
                new PasswordAuthenticationMethod(targetUsername, targetPassword))
            {
                Timeout = TimeSpan.FromSeconds(15),
            };

            using var src = new SftpClient(srcConn);
            using var dst = new SftpClient(dstConn);

            await Task.Run(() => src.Connect());
            await Task.Run(() => dst.Connect());

            if (!src.Exists(sourceDir))
            {
                src.Disconnect();
                dst.Disconnect();
                return new { success = false, message = $"Source slot path does not exist: {sourceDir}" };
            }

            EnsureRemoteDirectory(dst, targetDir);

            var entries = src.ListDirectory(sourceDir)
                .Where(e => e.Name != "." && e.Name != "..")
                .ToList();

            var copied = new List<object>();
            foreach (var entry in entries)
            {
                if (entry.IsDirectory) continue;

                var sourceFile = entry.FullName;
                var targetFile = targetDir.TrimEnd('/') + "/" + entry.Name;

                using var sourceStream = src.OpenRead(sourceFile);
                using var mem = new MemoryStream();
                await sourceStream.CopyToAsync(mem);
                mem.Position = 0;
                dst.UploadFile(mem, targetFile, true);

                copied.Add(new { name = entry.Name, size = entry.Attributes?.Size ?? 0, target = targetFile });
            }

            src.Disconnect();
            dst.Disconnect();

            logger.LogInformation("Cloned program slot from {SourceIp}:{SourceDir} to {TargetIp}:{TargetDir}", sourceIp, sourceDir, targetIp, targetDir);
            return new
            {
                success = true,
                source = new { ip = sourceIp, slot = sourceSlot, path = sourceDir },
                target = new { ip = targetIp, slot = targetSlot, path = targetDir },
                copiedFiles = copied,
                note = "Files cloned. Run progreg/progreset on target slot to register/start if needed."
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "CloneProgramSlot failed: {SourceIp} -> {TargetIp}", sourceIp, targetIp);
            return new { success = false, message = ex.Message };
        }
    }

    public static string GenerateJoinListJson(string configJson)
    {
        using var doc = JsonDocument.Parse(configJson);
        var root = doc.RootElement;

        var digital = new List<object>();
        var analog = new List<object>();
        var serial = new List<object>();

        if (root.TryGetProperty("rooms", out var rooms))
        {
            foreach (var room in rooms.EnumerateArray())
            {
                int offset = room.TryGetProperty("joinOffset", out var jo) ? jo.GetInt32() : 0;
                string roomName = room.TryGetProperty("name", out var rn) ? rn.GetString() ?? "" : "";
                var subs = room.TryGetProperty("subsystems", out var subsArr) ? subsArr : default;

                if (subs.ValueKind == JsonValueKind.Array)
                {
                    foreach (var sub in subs.EnumerateArray())
                    {
                        string subName = sub.GetString() ?? "";
                        if (subName == "av")
                        {
                            digital.Add(new { join = offset + 1, name = $"{roomName}_Power", direction = "output" });
                            digital.Add(new { join = offset + 2, name = $"{roomName}_PowerFb", direction = "input" });
                            analog.Add(new { join = offset + 1, name = $"{roomName}_Volume", direction = "output" });
                            analog.Add(new { join = offset + 2, name = $"{roomName}_VolumeFb", direction = "input" });
                            analog.Add(new { join = offset + 3, name = $"{roomName}_Source", direction = "output" });
                            analog.Add(new { join = offset + 4, name = $"{roomName}_SourceFb", direction = "input" });
                            serial.Add(new { join = offset + 1, name = $"{roomName}_SourceName", direction = "input" });
                        }
                        else if (subName == "lighting")
                        {
                            analog.Add(new { join = offset + 10, name = $"{roomName}_LightLevel", direction = "output" });
                            analog.Add(new { join = offset + 11, name = $"{roomName}_LightLevelFb", direction = "input" });
                        }
                        else if (subName == "shades")
                        {
                            digital.Add(new { join = offset + 10, name = $"{roomName}_ShadesOpen", direction = "output" });
                            digital.Add(new { join = offset + 11, name = $"{roomName}_ShadesClose", direction = "output" });
                            analog.Add(new { join = offset + 20, name = $"{roomName}_ShadesPosition", direction = "input" });
                        }
                        else if (subName == "hvac")
                        {
                            analog.Add(new { join = offset + 30, name = $"{roomName}_TempSetpoint", direction = "output" });
                            analog.Add(new { join = offset + 31, name = $"{roomName}_TempCurrent", direction = "input" });
                            serial.Add(new { join = offset + 10, name = $"{roomName}_HvacMode", direction = "input" });
                        }
                    }
                }
            }
        }

        var processor = "CP4";
        if (root.TryGetProperty("system", out var sys) && sys.TryGetProperty("processors", out var procs) && procs.GetArrayLength() > 0)
        {
            processor = procs[0].TryGetProperty("processor", out var pt) ? pt.GetString() ?? "CP4" : "CP4";
        }
        var projectId = root.TryGetProperty("projectId", out var pid) ? pid.GetString() ?? "" : "";

        var joinList = new
        {
            schemaVersion = "1.0",
            processor,
            projectId,
            debugMode = false,
            joins = new { digital, analog, serial },
        };

        return JsonSerializer.Serialize(joinList, new JsonSerializerOptions { WriteIndented = true });
    }

    static void EnsureRemoteDirectory(SftpClient sftp, string remotePath)
    {
        if (string.IsNullOrWhiteSpace(remotePath)) return;
        var normalized = remotePath.Replace("\\", "/").Trim();
        if (string.IsNullOrEmpty(normalized)) return;

        var parts = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var current = normalized.StartsWith("/") ? "/" : "";

        foreach (var part in parts)
        {
            current = (current == "/" ? "/" + part : current + "/" + part);
            if (!sftp.Exists(current))
            {
                sftp.CreateDirectory(current);
            }
        }
    }

    static object BuildFilePreview(string name, string targetPath, string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(bytes);
        var hashStr = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        return new { name, targetPath, sizeBytes = bytes.Length, contentHash = hashStr };
    }

    class DeployState
    {
        public string Id { get; set; } = "";
        public string Status { get; set; } = "preparing";
        public ConcurrentDictionary<string, FileTransferState> Files { get; } = new();
        public string? Error { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public CancellationTokenSource Cts { get; } = new();
    }

    class FileTransferState
    {
        public string Name { get; set; } = "";
        public string RemotePath { get; set; } = "";
        public long TotalBytes { get; set; }
        public long BytesTransferred { get; set; }
        public string Status { get; set; } = "pending";
        public string? Error { get; set; }
    }

    record FileToUpload(string Name, string RemotePath, string Content);
}
