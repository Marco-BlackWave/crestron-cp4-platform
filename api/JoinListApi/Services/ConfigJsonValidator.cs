using System.Text.Json;

namespace JoinListApi.Services;

internal static class ConfigJsonValidator
{
    public static bool TryValidateJoinList(string json, out string error)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

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

                    if (!entry.TryGetProperty("join", out var joinNum)
                        || joinNum.ValueKind != JsonValueKind.Number
                        || !joinNum.TryGetInt32(out var joinValue)
                        || joinValue <= 0)
                    {
                        error = $"joins.{joinType}[{index}].join must be a positive integer.";
                        return false;
                    }

                    if (!seenJoins.Add(joinValue))
                    {
                        error = $"Duplicate join number {joinValue} in joins.{joinType}.";
                        return false;
                    }

                    if (!entry.TryGetProperty("name", out var name)
                        || name.ValueKind != JsonValueKind.String
                        || string.IsNullOrWhiteSpace(name.GetString()))
                    {
                        error = $"joins.{joinType}[{index}].name must be a non-empty string.";
                        return false;
                    }

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

    public static bool TryValidateSystemConfig(string json, out string error)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

            if (!root.TryGetProperty("schemaVersion", out var schema)
                || schema.ValueKind != JsonValueKind.String
                || schema.GetString() != "1.0")
            {
                error = "schemaVersion must be '1.0'.";
                return false;
            }

            var validProcessorTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "CP4", "CP3", "RMC4", "VC-4" };
            if (!root.TryGetProperty("processor", out var processor)
                || processor.ValueKind != JsonValueKind.String
                || !validProcessorTypes.Contains(processor.GetString() ?? string.Empty))
            {
                error = $"processor must be one of: {string.Join(", ", validProcessorTypes)}.";
                return false;
            }

            if (!root.TryGetProperty("projectId", out var projectId)
                || projectId.ValueKind != JsonValueKind.String
                || string.IsNullOrWhiteSpace(projectId.GetString()))
            {
                error = "projectId is required and must be a non-empty string.";
                return false;
            }

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

            var validSubsystems = new HashSet<string> { "av", "lighting", "shades", "hvac", "security" };
            var validProtocols = new HashSet<string> { "ir", "serial", "ip", "bacnet", "modbus", "knx", "artnet", "shelly", "pjlink" };

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

                if (!room.TryGetProperty("name", out var roomName)
                    || roomName.ValueKind != JsonValueKind.String
                    || string.IsNullOrWhiteSpace(roomName.GetString()))
                {
                    error = $"rooms[{roomIndex}].name is required.";
                    return false;
                }

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

                foreach (var existing in seenOffsets)
                {
                    if (existing != offset && Math.Abs(existing - offset) < 100)
                    {
                        error = $"rooms[{roomIndex}].joinOffset {offset} too close to another room offset (minimum spacing: 100).";
                        return false;
                    }
                }

                if (hasProcessors && room.TryGetProperty("processorId", out var roomProcId)
                    && roomProcId.ValueKind == JsonValueKind.String
                    && !string.IsNullOrWhiteSpace(roomProcId.GetString())
                    && !definedProcessorIds.Contains(roomProcId.GetString()!))
                {
                    error = $"rooms[{roomIndex}] references undefined processor '{roomProcId.GetString()}'.";
                    return false;
                }

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
}
