using System;
using System.Collections.Generic;

namespace CrestronCP4.ProcessorSide.Configuration
{
    public sealed class SystemConfigValidator
    {
        private static readonly HashSet<string> ValidSubsystems = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "av", "lighting", "shades", "hvac", "security"
        };

        private static readonly HashSet<string> ValidProtocols = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "ir", "serial", "ip", "bacnet", "modbus"
        };

        public ValidationResult Validate(SystemConfig config)
        {
            var result = new ValidationResult();

            if (config == null)
            {
                result.Errors.Add("SystemConfig is null.");
                return result;
            }

            if (string.IsNullOrWhiteSpace(config.SchemaVersion))
            {
                result.Errors.Add("schemaVersion is missing.");
            }
            else if (!string.Equals(config.SchemaVersion, "1.0", StringComparison.OrdinalIgnoreCase))
            {
                result.Errors.Add("Unsupported schemaVersion: " + config.SchemaVersion);
            }

            if (string.IsNullOrWhiteSpace(config.Processor))
            {
                result.Errors.Add("processor is missing.");
            }
            else if (!string.Equals(config.Processor, "CP4", StringComparison.OrdinalIgnoreCase))
            {
                result.Errors.Add("processor must be CP4.");
            }

            if (string.IsNullOrWhiteSpace(config.ProjectId))
            {
                result.Errors.Add("projectId is required.");
            }

            ValidateSystem(config.System, result);
            ValidateRooms(config.Rooms, result);
            ValidateSources(config.Rooms, config.Sources, result);
            ValidateScenes(config.Scenes, config.Rooms, result);

            return result;
        }

        private static void ValidateSystem(SystemInfo system, ValidationResult result)
        {
            if (system == null)
            {
                result.Errors.Add("system section is missing.");
                return;
            }

            if (string.IsNullOrWhiteSpace(system.Name))
            {
                result.Errors.Add("system.name is required.");
            }

            if (string.IsNullOrWhiteSpace(system.EiscIpId))
            {
                result.Errors.Add("system.eiscIpId is required.");
            }

            if (string.IsNullOrWhiteSpace(system.EiscIpAddress))
            {
                result.Errors.Add("system.eiscIpAddress is required.");
            }
        }

        private static void ValidateRooms(List<RoomConfig> rooms, ValidationResult result)
        {
            if (rooms == null || rooms.Count == 0)
            {
                result.Errors.Add("At least one room is required.");
                return;
            }

            var roomIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var offsets = new HashSet<int>();

            foreach (var room in rooms)
            {
                if (room == null)
                {
                    result.Errors.Add("Room entry is null.");
                    continue;
                }

                if (string.IsNullOrWhiteSpace(room.Id))
                {
                    result.Errors.Add("Room id is required.");
                }
                else if (!roomIds.Add(room.Id))
                {
                    result.Errors.Add("Duplicate room id: " + room.Id);
                }

                if (string.IsNullOrWhiteSpace(room.Name))
                {
                    result.Errors.Add("Room name is required for room " + (room.Id ?? "unknown") + ".");
                }

                if (room.JoinOffset < 0)
                {
                    result.Errors.Add("Room joinOffset must be >= 0 for room " + (room.Id ?? "unknown") + ".");
                }
                else if (room.JoinOffset >= 900)
                {
                    result.Errors.Add("Room joinOffset must be < 900 (900+ reserved for system) for room " + (room.Id ?? "unknown") + ".");
                }
                else if (!offsets.Add(room.JoinOffset))
                {
                    result.Errors.Add("Duplicate joinOffset: " + room.JoinOffset);
                }

                ValidateRoomSubsystems(room, result);
                ValidateRoomDevices(room, result);
            }

            ValidateJoinOffsetSpacing(rooms, result);
        }

        private static void ValidateJoinOffsetSpacing(List<RoomConfig> rooms, ValidationResult result)
        {
            var sortedOffsets = new List<int>();
            foreach (var room in rooms)
            {
                if (room != null && room.JoinOffset >= 0)
                {
                    sortedOffsets.Add(room.JoinOffset);
                }
            }

            sortedOffsets.Sort();

            for (int i = 1; i < sortedOffsets.Count; i++)
            {
                int gap = sortedOffsets[i] - sortedOffsets[i - 1];
                if (gap < 100)
                {
                    result.Errors.Add("Join offset spacing must be at least 100. Offsets "
                        + sortedOffsets[i - 1] + " and " + sortedOffsets[i] + " are only " + gap + " apart.");
                }
            }
        }

        private static void ValidateRoomSubsystems(RoomConfig room, ValidationResult result)
        {
            if (room.Subsystems == null || room.Subsystems.Count == 0)
            {
                result.Errors.Add("At least one subsystem is required for room " + (room.Id ?? "unknown") + ".");
                return;
            }

            foreach (var sub in room.Subsystems)
            {
                if (!ValidSubsystems.Contains(sub))
                {
                    result.Errors.Add("Unknown subsystem '" + sub + "' in room " + (room.Id ?? "unknown") + ".");
                }
            }
        }

        private static void ValidateRoomDevices(RoomConfig room, ValidationResult result)
        {
            if (room.Devices == null || room.Devices.Count == 0)
            {
                return;
            }

            foreach (var kvp in room.Devices)
            {
                var device = kvp.Value;
                if (device == null)
                {
                    result.Errors.Add("Device assignment for '" + kvp.Key + "' is null in room " + (room.Id ?? "unknown") + ".");
                    continue;
                }

                if (string.IsNullOrWhiteSpace(device.ProfileId))
                {
                    result.Errors.Add("Device profileId is required for '" + kvp.Key + "' in room " + (room.Id ?? "unknown") + ".");
                }

                if (string.IsNullOrWhiteSpace(device.Protocol))
                {
                    result.Errors.Add("Device protocol is required for '" + kvp.Key + "' in room " + (room.Id ?? "unknown") + ".");
                }
                else if (!ValidProtocols.Contains(device.Protocol))
                {
                    result.Errors.Add("Unknown protocol '" + device.Protocol + "' for '" + kvp.Key + "' in room " + (room.Id ?? "unknown") + ".");
                }
            }
        }

        private static void ValidateSources(List<RoomConfig> rooms, List<SourceConfig> sources, ValidationResult result)
        {
            if (sources == null)
            {
                return;
            }

            var sourceIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var source in sources)
            {
                if (source == null)
                {
                    result.Errors.Add("Source entry is null.");
                    continue;
                }

                if (string.IsNullOrWhiteSpace(source.Id))
                {
                    result.Errors.Add("Source id is required.");
                }
                else if (!sourceIds.Add(source.Id))
                {
                    result.Errors.Add("Duplicate source id: " + source.Id);
                }

                if (string.IsNullOrWhiteSpace(source.Name))
                {
                    result.Errors.Add("Source name is required for source " + (source.Id ?? "unknown") + ".");
                }
            }

            if (rooms != null)
            {
                foreach (var room in rooms)
                {
                    if (room?.Sources == null) continue;
                    foreach (var srcRef in room.Sources)
                    {
                        if (!sourceIds.Contains(srcRef))
                        {
                            result.Errors.Add("Room " + room.Id + " references undefined source: " + srcRef);
                        }
                    }
                }
            }
        }

        private static void ValidateScenes(List<SceneConfig> scenes, List<RoomConfig> rooms, ValidationResult result)
        {
            if (scenes == null)
            {
                return;
            }

            var roomIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (rooms != null)
            {
                foreach (var room in rooms)
                {
                    if (room?.Id != null) roomIds.Add(room.Id);
                }
            }

            var sceneIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var scene in scenes)
            {
                if (scene == null)
                {
                    result.Errors.Add("Scene entry is null.");
                    continue;
                }

                if (string.IsNullOrWhiteSpace(scene.Id))
                {
                    result.Errors.Add("Scene id is required.");
                }
                else if (!sceneIds.Add(scene.Id))
                {
                    result.Errors.Add("Duplicate scene id: " + scene.Id);
                }

                if (string.IsNullOrWhiteSpace(scene.Name))
                {
                    result.Errors.Add("Scene name is required for scene " + (scene.Id ?? "unknown") + ".");
                }

                if (scene.Rooms != null)
                {
                    foreach (var roomRef in scene.Rooms)
                    {
                        if (!string.Equals(roomRef, "all", StringComparison.OrdinalIgnoreCase)
                            && !roomIds.Contains(roomRef))
                        {
                            result.Errors.Add("Scene " + scene.Id + " references undefined room: " + roomRef);
                        }
                    }
                }
            }
        }
    }
}
