using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;

namespace CoreTests
{
    public class SystemConfigValidatorTests
    {
        private readonly SystemConfigValidator _validator = new();

        private static SystemConfig CreateValidConfig()
        {
            return new SystemConfig
            {
                SchemaVersion = "1.0",
                ProjectId = "test-project",
                Processor = "CP4",
                System = new SystemInfo
                {
                    Name = "Test System",
                    EiscIpId = "0x03",
                    EiscIpAddress = "127.0.0.2"
                },
                Rooms = new List<RoomConfig>
                {
                    new RoomConfig
                    {
                        Id = "room1",
                        Name = "Room One",
                        JoinOffset = 0,
                        Subsystems = new List<string> { "av" },
                        Devices = new Dictionary<string, DeviceAssignment>
                        {
                            ["display"] = new DeviceAssignment { ProfileId = "test-display", Protocol = "ir" }
                        }
                    }
                },
                Sources = new List<SourceConfig>
                {
                    new SourceConfig { Id = "src1", Name = "Source 1", Type = "streaming" }
                },
                Scenes = new List<SceneConfig>()
            };
        }

        [Fact]
        public void ValidConfig_Passes()
        {
            var result = _validator.Validate(CreateValidConfig());
            Assert.True(result.IsValid);
        }

        [Fact]
        public void NullConfig_Fails()
        {
            var result = _validator.Validate(null);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("null"));
        }

        [Fact]
        public void MissingSchemaVersion_Fails()
        {
            var config = CreateValidConfig();
            config.SchemaVersion = null;
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("schemaVersion"));
        }

        [Fact]
        public void WrongSchemaVersion_Fails()
        {
            var config = CreateValidConfig();
            config.SchemaVersion = "2.0";
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
        }

        [Fact]
        public void MissingProcessor_Fails()
        {
            var config = CreateValidConfig();
            config.Processor = "";
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
        }

        [Fact]
        public void WrongProcessor_Fails()
        {
            var config = CreateValidConfig();
            config.Processor = "INVALID";
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("processor must be"));
        }

        [Fact]
        public void MissingProjectId_Fails()
        {
            var config = CreateValidConfig();
            config.ProjectId = "";
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
        }

        [Fact]
        public void MissingSystemSection_Fails()
        {
            var config = CreateValidConfig();
            config.System = null;
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("system"));
        }

        [Fact]
        public void MissingSystemName_Fails()
        {
            var config = CreateValidConfig();
            config.System!.Name = "";
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
        }

        [Fact]
        public void NoRooms_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms = new List<RoomConfig>();
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("room"));
        }

        [Fact]
        public void DuplicateRoomId_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms!.Add(new RoomConfig
            {
                Id = "room1",
                Name = "Duplicate",
                JoinOffset = 100,
                Subsystems = new List<string> { "av" }
            });
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("Duplicate room"));
        }

        [Fact]
        public void DuplicateJoinOffset_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms!.Add(new RoomConfig
            {
                Id = "room2",
                Name = "Room Two",
                JoinOffset = 0,
                Subsystems = new List<string> { "av" }
            });
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("Duplicate joinOffset"));
        }

        [Fact]
        public void JoinOffsetTooClose_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms!.Add(new RoomConfig
            {
                Id = "room2",
                Name = "Room Two",
                JoinOffset = 50,
                Subsystems = new List<string> { "av" }
            });
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("spacing"));
        }

        [Fact]
        public void JoinOffsetExactly100Apart_Passes()
        {
            var config = CreateValidConfig();
            config.Rooms!.Add(new RoomConfig
            {
                Id = "room2",
                Name = "Room Two",
                JoinOffset = 100,
                Subsystems = new List<string> { "av" }
            });
            var result = _validator.Validate(config);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void JoinOffset900Plus_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms![0].JoinOffset = 900;
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("900"));
        }

        [Fact]
        public void UnknownSubsystem_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms![0].Subsystems = new List<string> { "teleportation" };
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("Unknown subsystem"));
        }

        [Fact]
        public void UnknownProtocol_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms![0].Devices!["display"] = new DeviceAssignment { ProfileId = "test", Protocol = "quantum" };
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("Unknown protocol"));
        }

        [Fact]
        public void ValidProtocols_Pass()
        {
            foreach (var protocol in new[] { "ir", "serial", "ip", "bacnet", "modbus" })
            {
                var config = CreateValidConfig();
                config.Rooms![0].Devices!["display"] = new DeviceAssignment { ProfileId = "test", Protocol = protocol };
                var result = _validator.Validate(config);
                Assert.True(result.IsValid, $"Protocol '{protocol}' should be valid");
            }
        }

        [Fact]
        public void DuplicateSourceId_Fails()
        {
            var config = CreateValidConfig();
            config.Sources!.Add(new SourceConfig { Id = "src1", Name = "Duplicate", Type = "streaming" });
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("Duplicate source"));
        }

        [Fact]
        public void RoomReferencesUndefinedSource_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms![0].Sources = new List<string> { "nonexistent" };
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("undefined source"));
        }

        [Fact]
        public void SceneReferencesUndefinedRoom_Fails()
        {
            var config = CreateValidConfig();
            config.Scenes = new List<SceneConfig>
            {
                new SceneConfig { Id = "test-scene", Name = "Test", Rooms = new List<string> { "nonexistent" } }
            };
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("undefined room"));
        }

        [Fact]
        public void SceneWithAllRooms_Passes()
        {
            var config = CreateValidConfig();
            config.Scenes = new List<SceneConfig>
            {
                new SceneConfig { Id = "test-scene", Name = "Test", Rooms = new List<string> { "all" } }
            };
            var result = _validator.Validate(config);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void DuplicateSceneId_Fails()
        {
            var config = CreateValidConfig();
            config.Scenes = new List<SceneConfig>
            {
                new SceneConfig { Id = "s1", Name = "Scene 1" },
                new SceneConfig { Id = "s1", Name = "Scene 2" }
            };
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("Duplicate scene"));
        }
    }
}
