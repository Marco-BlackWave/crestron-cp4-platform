using System.Collections.Concurrent;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
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

var fileLock = new SemaphoreSlim(1, 1);

logger.LogInformation("JoinList path: {Path}", joinListPath);
logger.LogInformation("SystemConfig path: {Path}", systemConfigPath);
logger.LogInformation("Devices path: {Path}", devicesPath);
logger.LogInformation("Projects path: {Path}", projectsPath);

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
        await fileLock.WaitAsync();
        try
        {
            string json = await File.ReadAllTextAsync(joinListPath);
            return Results.Text(json, "application/json");
        }
        finally
        {
            fileLock.Release();
        }
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

        await fileLock.WaitAsync();
        try
        {
            // Atomic write: write to temp file, then move
            var tempPath = joinListPath + ".tmp";
            await File.WriteAllTextAsync(tempPath, body);
            File.Move(tempPath, joinListPath, overwrite: true);
        }
        finally
        {
            fileLock.Release();
        }

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
        await fileLock.WaitAsync();
        try
        {
            string json = await File.ReadAllTextAsync(systemConfigPath);
            return Results.Text(json, "application/json");
        }
        finally
        {
            fileLock.Release();
        }
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

        await fileLock.WaitAsync();
        try
        {
            var tempPath = systemConfigPath + ".tmp";
            await File.WriteAllTextAsync(tempPath, body);
            File.Move(tempPath, systemConfigPath, overwrite: true);
        }
        finally
        {
            fileLock.Release();
        }

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

app.Run();

static bool TryValidateJoinList(string json, out string error)
{
    try
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        // Top-level fields
        if (!root.TryGetProperty("schemaVersion", out var schema)
            || schema.ValueKind != JsonValueKind.String
            || schema.GetString() != "1.0")
        {
            error = "schemaVersion must be '1.0'.";
            return false;
        }

        if (!root.TryGetProperty("processor", out var processor)
            || processor.ValueKind != JsonValueKind.String
            || !string.Equals(processor.GetString(), "CP4", StringComparison.OrdinalIgnoreCase))
        {
            error = "processor must be 'CP4'.";
            return false;
        }

        if (!root.TryGetProperty("projectId", out var projectId)
            || projectId.ValueKind != JsonValueKind.String
            || string.IsNullOrWhiteSpace(projectId.GetString()))
        {
            error = "projectId is required and must be a non-empty string.";
            return false;
        }

        if (!root.TryGetProperty("joins", out var joins) || joins.ValueKind != JsonValueKind.Object)
        {
            error = "joins section is required and must be an object.";
            return false;
        }

        // Validate each join type array
        string[] joinTypes = ["digital", "analog", "serial"];
        foreach (var joinType in joinTypes)
        {
            if (!joins.TryGetProperty(joinType, out var arr))
            {
                error = $"joins must include a '{joinType}' array.";
                return false;
            }

            if (arr.ValueKind != JsonValueKind.Array)
            {
                error = $"joins.{joinType} must be an array.";
                return false;
            }

            var seenJoins = new HashSet<int>();
            int index = 0;
            foreach (var entry in arr.EnumerateArray())
            {
                if (entry.ValueKind != JsonValueKind.Object)
                {
                    error = $"joins.{joinType}[{index}] must be an object.";
                    return false;
                }

                // Validate join number
                if (!entry.TryGetProperty("join", out var joinNum)
                    || joinNum.ValueKind != JsonValueKind.Number
                    || !joinNum.TryGetInt32(out var joinValue)
                    || joinValue <= 0)
                {
                    error = $"joins.{joinType}[{index}].join must be a positive integer.";
                    return false;
                }

                // Check for duplicates within type
                if (!seenJoins.Add(joinValue))
                {
                    error = $"Duplicate join number {joinValue} in joins.{joinType}.";
                    return false;
                }

                // Validate name
                if (!entry.TryGetProperty("name", out var name)
                    || name.ValueKind != JsonValueKind.String
                    || string.IsNullOrWhiteSpace(name.GetString()))
                {
                    error = $"joins.{joinType}[{index}].name must be a non-empty string.";
                    return false;
                }

                // Validate direction
                if (!entry.TryGetProperty("direction", out var direction)
                    || direction.ValueKind != JsonValueKind.String)
                {
                    error = $"joins.{joinType}[{index}].direction must be 'input' or 'output'.";
                    return false;
                }

                var dir = direction.GetString();
                if (!string.Equals(dir, "input", StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(dir, "output", StringComparison.OrdinalIgnoreCase))
                {
                    error = $"joins.{joinType}[{index}].direction must be 'input' or 'output', got '{dir}'.";
                    return false;
                }

                index++;
            }
        }

        error = string.Empty;
        return true;
    }
    catch (JsonException)
    {
        error = "Invalid JSON format.";
        return false;
    }
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

static bool TryValidateSystemConfig(string json, out string error)
{
    try
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        // schemaVersion
        if (!root.TryGetProperty("schemaVersion", out var schema)
            || schema.ValueKind != JsonValueKind.String
            || schema.GetString() != "1.0")
        {
            error = "schemaVersion must be '1.0'.";
            return false;
        }

        // processor — support multiple types
        var validProcessorTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "CP4", "CP3", "RMC4", "VC-4" };
        if (!root.TryGetProperty("processor", out var processor)
            || processor.ValueKind != JsonValueKind.String
            || !validProcessorTypes.Contains(processor.GetString() ?? ""))
        {
            error = $"processor must be one of: {string.Join(", ", validProcessorTypes)}.";
            return false;
        }

        // projectId
        if (!root.TryGetProperty("projectId", out var projectId)
            || projectId.ValueKind != JsonValueKind.String
            || string.IsNullOrWhiteSpace(projectId.GetString()))
        {
            error = "projectId is required and must be a non-empty string.";
            return false;
        }

        // system block
        if (!root.TryGetProperty("system", out var system) || system.ValueKind != JsonValueKind.Object)
        {
            error = "system section is required.";
            return false;
        }

        if (!system.TryGetProperty("name", out var sysName)
            || sysName.ValueKind != JsonValueKind.String
            || string.IsNullOrWhiteSpace(sysName.GetString()))
        {
            error = "system.name is required.";
            return false;
        }

        // Validate processors array if present
        var definedProcessorIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var definedEiscIpIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        bool hasProcessors = system.TryGetProperty("processors", out var processorsEl)
            && processorsEl.ValueKind == JsonValueKind.Array
            && processorsEl.GetArrayLength() > 0;

        if (hasProcessors)
        {
            int procIndex = 0;
            foreach (var proc in processorsEl.EnumerateArray())
            {
                if (!proc.TryGetProperty("id", out var procId)
                    || procId.ValueKind != JsonValueKind.String
                    || string.IsNullOrWhiteSpace(procId.GetString()))
                {
                    error = $"system.processors[{procIndex}].id is required.";
                    return false;
                }
                if (!definedProcessorIds.Add(procId.GetString()!))
                {
                    error = $"Duplicate processor ID '{procId.GetString()}'.";
                    return false;
                }
                if (proc.TryGetProperty("eiscIpId", out var eiscId) && eiscId.ValueKind == JsonValueKind.String)
                {
                    if (!definedEiscIpIds.Add(eiscId.GetString()!))
                    {
                        error = $"Duplicate EISC IP-ID '{eiscId.GetString()}' on processor '{procId.GetString()}'.";
                        return false;
                    }
                }
                procIndex++;
            }
        }

        // Valid subsystems and protocols
        var validSubsystems = new HashSet<string> { "av", "lighting", "shades", "hvac", "security" };
        var validProtocols = new HashSet<string> { "ir", "serial", "ip", "bacnet", "modbus", "knx", "artnet", "shelly", "pjlink" };

        // Rooms
        if (!root.TryGetProperty("rooms", out var rooms) || rooms.ValueKind != JsonValueKind.Array)
        {
            error = "rooms must be an array.";
            return false;
        }

        var seenRoomIds = new HashSet<string>();
        var seenOffsets = new HashSet<int>();
        int roomIndex = 0;
        foreach (var room in rooms.EnumerateArray())
        {
            // id
            if (!room.TryGetProperty("id", out var roomId)
                || roomId.ValueKind != JsonValueKind.String
                || string.IsNullOrWhiteSpace(roomId.GetString()))
            {
                error = $"rooms[{roomIndex}].id is required.";
                return false;
            }
            if (!seenRoomIds.Add(roomId.GetString()!))
            {
                error = $"Duplicate room ID '{roomId.GetString()}'.";
                return false;
            }

            // name
            if (!room.TryGetProperty("name", out var roomName)
                || roomName.ValueKind != JsonValueKind.String
                || string.IsNullOrWhiteSpace(roomName.GetString()))
            {
                error = $"rooms[{roomIndex}].name is required.";
                return false;
            }

            // joinOffset
            if (!room.TryGetProperty("joinOffset", out var offsetEl)
                || offsetEl.ValueKind != JsonValueKind.Number
                || !offsetEl.TryGetInt32(out var offset))
            {
                error = $"rooms[{roomIndex}].joinOffset must be an integer.";
                return false;
            }
            if (offset < 0 || offset >= 900)
            {
                error = $"rooms[{roomIndex}].joinOffset must be >= 0 and < 900.";
                return false;
            }
            if (!seenOffsets.Add(offset))
            {
                error = $"Duplicate joinOffset {offset}.";
                return false;
            }

            // Check offset spacing: all offsets must differ by at least 100
            foreach (var existing in seenOffsets)
            {
                if (existing != offset && Math.Abs(existing - offset) < 100)
                {
                    error = $"rooms[{roomIndex}].joinOffset {offset} too close to another room offset (minimum spacing: 100).";
                    return false;
                }
            }

            // Validate processorId reference
            if (hasProcessors && room.TryGetProperty("processorId", out var roomProcId)
                && roomProcId.ValueKind == JsonValueKind.String
                && !string.IsNullOrWhiteSpace(roomProcId.GetString())
                && !definedProcessorIds.Contains(roomProcId.GetString()!))
            {
                error = $"rooms[{roomIndex}] references undefined processor '{roomProcId.GetString()}'.";
                return false;
            }

            // subsystems
            if (room.TryGetProperty("subsystems", out var subs) && subs.ValueKind == JsonValueKind.Array)
            {
                foreach (var sub in subs.EnumerateArray())
                {
                    var subVal = sub.GetString()?.ToLowerInvariant();
                    if (subVal != null && !validSubsystems.Contains(subVal))
                    {
                        error = $"rooms[{roomIndex}] has invalid subsystem '{subVal}'. Valid: {string.Join(", ", validSubsystems)}.";
                        return false;
                    }
                }
            }

            // devices — validate protocols
            if (room.TryGetProperty("devices", out var devices) && devices.ValueKind == JsonValueKind.Object)
            {
                foreach (var dev in devices.EnumerateObject())
                {
                    if (dev.Value.TryGetProperty("protocol", out var proto))
                    {
                        var protoVal = proto.GetString()?.ToLowerInvariant();
                        if (protoVal != null && !validProtocols.Contains(protoVal))
                        {
                            error = $"rooms[{roomIndex}].devices.{dev.Name} has invalid protocol '{protoVal}'.";
                            return false;
                        }
                    }
                }
            }

            roomIndex++;
        }

        // Sources
        if (root.TryGetProperty("sources", out var sources) && sources.ValueKind == JsonValueKind.Array)
        {
            var seenSourceIds = new HashSet<string>();
            int srcIndex = 0;
            foreach (var src in sources.EnumerateArray())
            {
                if (!src.TryGetProperty("id", out var srcId)
                    || srcId.ValueKind != JsonValueKind.String
                    || string.IsNullOrWhiteSpace(srcId.GetString()))
                {
                    error = $"sources[{srcIndex}].id is required.";
                    return false;
                }
                if (!seenSourceIds.Add(srcId.GetString()!))
                {
                    error = $"Duplicate source ID '{srcId.GetString()}'.";
                    return false;
                }
                srcIndex++;
            }

            // Validate room source refs
            foreach (var room in rooms.EnumerateArray())
            {
                if (room.TryGetProperty("sources", out var roomSources) && roomSources.ValueKind == JsonValueKind.Array)
                {
                    foreach (var s in roomSources.EnumerateArray())
                    {
                        var sRef = s.GetString();
                        if (sRef != null && !seenSourceIds.Contains(sRef))
                        {
                            var rId = room.GetProperty("id").GetString();
                            error = $"Room '{rId}' references undefined source '{sRef}'.";
                            return false;
                        }
                    }
                }
            }
        }

        // Scenes
        if (root.TryGetProperty("scenes", out var scenes) && scenes.ValueKind == JsonValueKind.Array)
        {
            var seenSceneIds = new HashSet<string>();
            int scnIndex = 0;
            foreach (var scn in scenes.EnumerateArray())
            {
                if (!scn.TryGetProperty("id", out var scnId)
                    || scnId.ValueKind != JsonValueKind.String
                    || string.IsNullOrWhiteSpace(scnId.GetString()))
                {
                    error = $"scenes[{scnIndex}].id is required.";
                    return false;
                }
                if (!seenSceneIds.Add(scnId.GetString()!))
                {
                    error = $"Duplicate scene ID '{scnId.GetString()}'.";
                    return false;
                }

                // Validate room refs in scenes
                if (scn.TryGetProperty("rooms", out var scnRooms) && scnRooms.ValueKind == JsonValueKind.Array)
                {
                    foreach (var r in scnRooms.EnumerateArray())
                    {
                        var rRef = r.GetString();
                        if (rRef != null && rRef != "all" && !seenRoomIds.Contains(rRef))
                        {
                            error = $"Scene '{scnId.GetString()}' references undefined room '{rRef}'.";
                            return false;
                        }
                    }
                }

                scnIndex++;
            }
        }

        error = string.Empty;
        return true;
    }
    catch (JsonException)
    {
        error = "Invalid JSON format.";
        return false;
    }
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
    static readonly ConcurrentDictionary<string, ScanState> _scans = new();
    static int _activeScanCount;

    static readonly int[] ProbePorts = [41794, 80, 443, 23, 4998, 502, 47808];

    static readonly Dictionary<int, string> PortLabels = new()
    {
        [41794] = "CIP", [80] = "HTTP", [443] = "HTTPS", [23] = "Telnet",
        [4998] = "PJLink", [502] = "Modbus", [47808] = "BACnet",
    };

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
                var semaphore = new SemaphoreSlim(20);
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
        // Step 1: Ping
        long pingMs;
        try
        {
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(ip, 500);
            if (reply.Status != IPStatus.Success) return null;
            pingMs = reply.RoundtripTime;
        }
        catch
        {
            return null;
        }

        // Step 2: TCP port probe
        var openPorts = new List<int>();
        var portTasks = ProbePorts.Select(async port =>
        {
            try
            {
                using var client = new TcpClient();
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(1000);
                await client.ConnectAsync(ip, port, cts.Token);
                lock (openPorts) { openPorts.Add(port); }
            }
            catch { /* port closed or timeout */ }
        });
        await Task.WhenAll(portTasks);

        // Step 3: DNS reverse lookup
        string hostname = "";
        try
        {
            var entry = await Dns.GetHostEntryAsync(ip);
            hostname = entry.HostName ?? "";
        }
        catch { /* no DNS */ }

        // Step 4: Try HTTP title extraction if DNS fails and HTTP is open
        string httpTitle = "";
        if (string.IsNullOrEmpty(hostname) && (openPorts.Contains(80) || openPorts.Contains(443)))
        {
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
                var scheme = openPorts.Contains(443) ? "https" : "http";
                var html = await http.GetStringAsync($"{scheme}://{ip}/", ct);
                var titleMatch = System.Text.RegularExpressions.Regex.Match(html, @"<title>(.*?)</title>", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (titleMatch.Success) httpTitle = titleMatch.Groups[1].Value.Trim();
            }
            catch { /* no HTTP title */ }
        }

        // Step 5: MAC address + vendor lookup (from ARP table after successful ping)
        var mac = LookupMac(ip.ToString());
        var vendor = LookupVendor(mac);

        // Step 6: Classify device type (use vendor hint)
        var deviceType = ClassifyDevice(openPorts, httpTitle, vendor);
        var isCrestron = deviceType == "Crestron"
            || vendor.Equals("Crestron", StringComparison.OrdinalIgnoreCase)
            || (hostname.IndexOf("crestron", StringComparison.OrdinalIgnoreCase) >= 0);

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
        };
    }

    static string ClassifyDevice(List<int> ports, string httpTitle = "", string vendor = "")
    {
        // Vendor-based classification first
        if (!string.IsNullOrEmpty(vendor))
        {
            var v = vendor.ToLowerInvariant();
            if (v.Contains("crestron")) return "Crestron";
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
        if (ports.Contains(4998)) return "PJLink Projector";
        if (ports.Contains(502)) return "Modbus Device";
        if (ports.Contains(47808)) return "BACnet Device";

        // Check HTTP title for known vendor names
        if (!string.IsNullOrEmpty(httpTitle))
        {
            var titleLower = httpTitle.ToLowerInvariant();
            if (titleLower.Contains("crestron")) return "Crestron";
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
    }

    // OUI prefix → vendor name (first 3 bytes of MAC)
    static readonly Dictionary<string, string> OuiVendors = new(StringComparer.OrdinalIgnoreCase)
    {
        ["00:10:7F"] = "Crestron",
        ["00:10:C3"] = "Crestron",
        ["00:1A:2B"] = "Crestron",
        ["00:24:A8"] = "Crestron",
        ["B8:D8:12"] = "Crestron",
        ["00:05:CD"] = "Denon/Marantz",
        ["00:0E:7B"] = "Extron",
        ["00:1D:C1"] = "Extron",
        ["00:60:B5"] = "Extron",
        ["00:0A:E4"] = "QSC",
        ["00:21:CC"] = "Biamp",
        ["00:0D:6B"] = "Shure",
        ["00:0F:F7"] = "Lutron",
        ["00:90:0B"] = "Lutron",
        ["00:04:A3"] = "AMX/Harman",
        ["70:B3:D5"] = "AV Device",
        ["C8:2C:2B"] = "Atlona",
        ["00:14:39"] = "Atlona",
        ["AC:CF:23"] = "Shelly",
        ["34:94:54"] = "Shelly",
        ["E8:DB:84"] = "Shelly",
    };

    static string LookupMac(string ip)
    {
        try
        {
            var psi = new System.Diagnostics.ProcessStartInfo("arp", $"-a {ip}")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            using var proc = System.Diagnostics.Process.Start(psi);
            if (proc == null) return "";
            var output = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit(2000);
            // Parse ARP output for MAC: look for lines containing the IP
            foreach (var line in output.Split('\n'))
            {
                var trimmed = line.Trim();
                if (!trimmed.Contains(ip)) continue;
                // Windows format: "192.168.1.10    00-10-7f-xx-xx-xx    dynamic"
                var parts = trimmed.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 2)
                {
                    var mac = parts[1].Replace('-', ':').ToUpperInvariant();
                    if (mac.Length >= 8 && mac.Contains(':')) return mac;
                }
            }
        }
        catch { /* ARP lookup failed */ }
        return "";
    }

    static string LookupVendor(string mac)
    {
        if (string.IsNullOrEmpty(mac) || mac.Length < 8) return "";
        var prefix = mac[..8].ToUpperInvariant(); // "00:10:7F"
        return OuiVendors.TryGetValue(prefix, out var vendor) ? vendor : "";
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
            return new { success = true, output = response.Trim() };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to restart program on {Ip}.", ip);
            return new { success = false, output = ex.Message };
        }
    }

    static string GenerateJoinListJson(string configJson)
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
