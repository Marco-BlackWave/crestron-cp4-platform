using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;

namespace CoreTests
{
    public class SubsystemTests
    {
        [Fact]
        public void ValidSubsystemNames()
        {
            var validNames = new[] { "av", "lighting", "shades", "hvac", "security" };
            var validator = new SystemConfigValidator();

            foreach (var name in validNames)
            {
                var config = CreateMinimalConfig(name);
                var result = validator.Validate(config);
                Assert.True(result.IsValid, $"Subsystem '{name}' should be valid");
            }
        }

        [Fact]
        public void SubsystemNames_CaseInsensitive()
        {
            var validator = new SystemConfigValidator();
            var config = CreateMinimalConfig("AV");
            var result = validator.Validate(config);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void InvalidSubsystemName_Fails()
        {
            var validator = new SystemConfigValidator();
            var config = CreateMinimalConfig("invalid_subsystem");
            var result = validator.Validate(config);
            Assert.False(result.IsValid);
        }

        [Fact]
        public void EmptySubsystems_Fails()
        {
            var validator = new SystemConfigValidator();
            var config = CreateMinimalConfig("av");
            config.Rooms![0].Subsystems = new List<string>();
            var result = validator.Validate(config);
            Assert.False(result.IsValid);
        }

        [Fact]
        public void MultipleSubsystems_AllValid()
        {
            var validator = new SystemConfigValidator();
            var config = CreateMinimalConfig("av");
            config.Rooms![0].Subsystems = new List<string> { "av", "lighting", "shades", "hvac" };
            var result = validator.Validate(config);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void SceneActions_LightingLevel()
        {
            var actions = new SceneActions { Lighting = 50 };
            Assert.Equal(50, actions.Lighting);
        }

        [Fact]
        public void SceneActions_ShadesState()
        {
            var actions = new SceneActions { Shades = "closed" };
            Assert.Equal("closed", actions.Shades);
        }

        [Fact]
        public void SceneActions_AvOff()
        {
            var actions = new SceneActions { Av = "off" };
            Assert.Equal("off", actions.Av);
        }

        [Fact]
        public void SceneActions_SourceSelection()
        {
            var actions = new SceneActions { Source = "appletv" };
            Assert.Equal("appletv", actions.Source);
        }

        [Fact]
        public void SceneConfig_TargetsAllRooms()
        {
            var scene = new SceneConfig
            {
                Id = "goodnight",
                Name = "Good Night",
                Rooms = new List<string> { "all" },
                Actions = new SceneActions { Lighting = 0, Shades = "closed", Av = "off" }
            };
            Assert.Contains("all", scene.Rooms);
        }

        [Fact]
        public void SceneConfig_TargetsSpecificRooms()
        {
            var scene = new SceneConfig
            {
                Id = "movie",
                Name = "Movie Night",
                Rooms = new List<string> { "living", "media" },
                Actions = new SceneActions { Lighting = 20, Source = "appletv" }
            };
            Assert.Equal(2, scene.Rooms.Count);
        }

        private static SystemConfig CreateMinimalConfig(string subsystemName)
        {
            return new SystemConfig
            {
                SchemaVersion = "1.0",
                ProjectId = "test",
                Processor = "CP4",
                System = new SystemInfo { Name = "Test", EiscIpId = "0x03", EiscIpAddress = "127.0.0.2" },
                Rooms = new List<RoomConfig>
                {
                    new RoomConfig
                    {
                        Id = "room1",
                        Name = "Room 1",
                        JoinOffset = 0,
                        Subsystems = new List<string> { subsystemName }
                    }
                }
            };
        }
    }
}
