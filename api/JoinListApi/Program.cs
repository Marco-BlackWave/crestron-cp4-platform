using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

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

string apiKey = builder.Configuration["ApiKey"] ?? "";
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

var fileLock = new SemaphoreSlim(1, 1);

logger.LogInformation("JoinList path: {Path}", joinListPath);
logger.LogInformation("SystemConfig path: {Path}", systemConfigPath);
logger.LogInformation("Devices path: {Path}", devicesPath);

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

// Auth middleware — skip /api/health
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api")
        && !context.Request.Path.StartsWithSegments("/api/health"))
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogError("API key is not configured on the server.");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { message = "API key is not configured." });
            return;
        }

        if (!context.Request.Headers.TryGetValue("X-API-Key", out var provided)
            || !FixedTimeEquals(provided.ToString(), apiKey))
        {
            logger.LogWarning("Unauthorized request to {Path} from {IP}",
                context.Request.Path, context.Connection.RemoteIpAddress);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { message = "Missing or invalid API key." });
            return;
        }
    }

    await next();
});

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

app.Run();

static bool FixedTimeEquals(string a, string b)
{
    var bytesA = Encoding.UTF8.GetBytes(a);
    var bytesB = Encoding.UTF8.GetBytes(b);
    return CryptographicOperations.FixedTimeEquals(bytesA, bytesB);
}

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

        // processor
        if (!root.TryGetProperty("processor", out var processor)
            || processor.ValueKind != JsonValueKind.String
            || !string.Equals(processor.GetString(), "CP4", StringComparison.OrdinalIgnoreCase))
        {
            error = "processor must be 'CP4'.";
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

        var rooms = new List<object>();
        if (root.TryGetProperty("rooms", out var roomsEl))
        {
            foreach (var room in roomsEl.EnumerateArray())
            {
                var id = room.GetProperty("id").GetString()!;
                var name = room.GetProperty("name").GetString()!;
                var offset = room.GetProperty("joinOffset").GetInt32();

                rooms.Add(new
                {
                    id,
                    name,
                    joins = new
                    {
                        digital = RoomDigital.Select(j => new { join = (int)Resolve(offset, j.offset), name = j.name, direction = j.direction }).ToArray(),
                        analog = RoomAnalog.Select(j => new { join = (int)Resolve(offset, j.offset), name = j.name, direction = j.direction }).ToArray(),
                        serial = RoomSerial.Select(j => new { join = (int)Resolve(offset, j.offset), name = j.name, direction = j.direction }).ToArray(),
                    }
                });
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

        return new
        {
            version = "1.0",
            generatedAt = DateTime.UtcNow.ToString("o"),
            rooms,
            system = new
            {
                digital = systemDigital,
                serial = systemSerial,
            }
        };
    }
}
