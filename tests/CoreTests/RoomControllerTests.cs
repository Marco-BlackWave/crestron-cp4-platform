using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;

namespace CoreTests
{
    /// <summary>
    /// Tests for RoomConfig model and room-related validation.
    /// RoomController itself depends on SubsystemFactory (Crestron chain),
    /// so we test the configuration models and validation rules here.
    /// </summary>
    public class RoomControllerTests
    {
        private readonly SystemConfigValidator _validator = new();

        [Fact]
        public void RoomConfig_Properties()
        {
            var config = new RoomConfig
            {
                Id = "test",
                Name = "Test Room",
                JoinOffset = 200,
                Subsystems = new List<string> { "av", "lighting" }
            };
            Assert.Equal("test", config.Id);
            Assert.Equal("Test Room", config.Name);
            Assert.Equal(200, config.JoinOffset);
            Assert.Equal(2, config.Subsystems.Count);
        }

        [Fact]
        public void RoomConfig_SupportsFourSubsystems()
        {
            var config = new RoomConfig
            {
                Id = "master",
                Name = "Master Suite",
                JoinOffset = 0,
                Subsystems = new List<string> { "av", "lighting", "shades", "hvac" }
            };
            Assert.Equal(4, config.Subsystems.Count);
        }

        [Fact]
        public void RoomConfig_DeviceAssignment()
        {
            var config = new RoomConfig
            {
                Id = "room1",
                Name = "Room 1",
                JoinOffset = 0,
                Subsystems = new List<string> { "av" },
                Devices = new Dictionary<string, DeviceAssignment>
                {
                    ["display"] = new DeviceAssignment { ProfileId = "samsung-qn-series", Protocol = "ir", Port = "IR-1" },
                    ["audio"] = new DeviceAssignment { ProfileId = "denon-avr", Protocol = "serial", Port = "COM-1" }
                }
            };
            Assert.Equal(2, config.Devices.Count);
            Assert.Equal("samsung-qn-series", config.Devices["display"].ProfileId);
            Assert.Equal("serial", config.Devices["audio"].Protocol);
        }

        [Fact]
        public void RoomConfig_SourcesList()
        {
            var config = new RoomConfig
            {
                Id = "room1",
                Name = "Room 1",
                JoinOffset = 0,
                Subsystems = new List<string> { "av" },
                Sources = new List<string> { "appletv", "cable", "sonos" }
            };
            Assert.Equal(3, config.Sources.Count);
            Assert.Contains("appletv", config.Sources);
        }

        [Fact]
        public void ThreeRoomsWithCorrectSpacing_Passes()
        {
            var config = CreateValidConfig();
            config.Rooms = new List<RoomConfig>
            {
                new RoomConfig { Id = "r1", Name = "Room 1", JoinOffset = 0, Subsystems = new List<string> { "av" } },
                new RoomConfig { Id = "r2", Name = "Room 2", JoinOffset = 100, Subsystems = new List<string> { "av" } },
                new RoomConfig { Id = "r3", Name = "Room 3", JoinOffset = 200, Subsystems = new List<string> { "av" } }
            };
            var result = _validator.Validate(config);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void NegativeJoinOffset_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms![0].JoinOffset = -1;
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
        }

        [Fact]
        public void MissingRoomName_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms![0].Name = "";
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
        }

        [Fact]
        public void MissingRoomId_Fails()
        {
            var config = CreateValidConfig();
            config.Rooms![0].Id = "";
            var result = _validator.Validate(config);
            Assert.False(result.IsValid);
        }

        [Fact]
        public void DeviceAssignment_IpProtocol()
        {
            var assignment = new DeviceAssignment
            {
                ProfileId = "lg-webos",
                Protocol = "ip",
                Address = "192.168.1.60"
            };
            Assert.Equal("ip", assignment.Protocol);
            Assert.Equal("192.168.1.60", assignment.Address);
        }

        [Fact]
        public void DeviceAssignment_BacnetProtocol()
        {
            var assignment = new DeviceAssignment
            {
                ProfileId = "bacnet-thermostat",
                Protocol = "bacnet",
                ObjectId = 1
            };
            Assert.Equal("bacnet", assignment.Protocol);
            Assert.Equal(1, assignment.ObjectId);
        }

        private static SystemConfig CreateValidConfig()
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
                        Subsystems = new List<string> { "av" }
                    }
                }
            };
        }
    }
}
