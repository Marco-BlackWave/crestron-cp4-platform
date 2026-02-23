using System.Collections.Generic;
using System.Linq;
using CrestronCP4.ProcessorSide.Configuration;

namespace CoreTests
{
    public class JoinContractExporterTests
    {
        private readonly JoinContractExporter _exporter = new();

        private static SystemConfig CreateTwoRoomConfig()
        {
            return new SystemConfig
            {
                SchemaVersion = "1.0",
                ProjectId = "test",
                Processor = "CP4",
                System = new SystemInfo { Name = "Test", EiscIpId = "0x03", EiscIpAddress = "127.0.0.2" },
                Rooms = new List<RoomConfig>
                {
                    new RoomConfig { Id = "master", Name = "Master Suite", JoinOffset = 0, Subsystems = new List<string> { "av" } },
                    new RoomConfig { Id = "living", Name = "Living Room", JoinOffset = 100, Subsystems = new List<string> { "av" } }
                }
            };
        }

        [Fact]
        public void Export_SetsVersion()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            Assert.Equal("1.0", contract.Version);
        }

        [Fact]
        public void Export_SetsGeneratedAt()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            Assert.False(string.IsNullOrWhiteSpace(contract.GeneratedAt));
        }

        [Fact]
        public void Export_CreatesRoomEntries()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            Assert.Equal(2, contract.Rooms.Count);
            Assert.Equal("master", contract.Rooms[0].Id);
            Assert.Equal("living", contract.Rooms[1].Id);
        }

        [Fact]
        public void Export_RoomNames_Match()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            Assert.Equal("Master Suite", contract.Rooms[0].Name);
            Assert.Equal("Living Room", contract.Rooms[1].Name);
        }

        [Fact]
        public void Export_Room0_PowerToggle_IsJoin1()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var powerToggle = contract.Rooms[0].Joins.Digital.First(j => j.Name == "Power Toggle");
            Assert.Equal((ushort)1, powerToggle.Join);
            Assert.Equal("input", powerToggle.Direction);
        }

        [Fact]
        public void Export_Room100_PowerToggle_IsJoin101()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var powerToggle = contract.Rooms[1].Joins.Digital.First(j => j.Name == "Power Toggle");
            Assert.Equal((ushort)101, powerToggle.Join);
        }

        [Fact]
        public void Export_Room0_PowerFeedback_IsOutput()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var powerFb = contract.Rooms[0].Joins.Digital.First(j => j.Name == "Power Feedback");
            Assert.Equal("output", powerFb.Direction);
        }

        [Fact]
        public void Export_Room0_HasAnalogJoins()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            Assert.True(contract.Rooms[0].Joins.Analog.Count > 0);
        }

        [Fact]
        public void Export_Room0_HasSerialJoins()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            Assert.True(contract.Rooms[0].Joins.Serial.Count > 0);
        }

        [Fact]
        public void Export_Room0_VolumeSetIsInput()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var volSet = contract.Rooms[0].Joins.Analog.First(j => j.Name == "Volume Set");
            Assert.Equal("input", volSet.Direction);
        }

        [Fact]
        public void Export_Room0_RoomNameIsOutput()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var roomName = contract.Rooms[0].Joins.Serial.First(j => j.Name == "Room Name");
            Assert.Equal("output", roomName.Direction);
        }

        [Fact]
        public void Export_SystemDigital_HasAllOff()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var allOff = contract.System.Digital.First(j => j.Name == "All Off");
            Assert.Equal((ushort)900, allOff.Join);
            Assert.Equal("input", allOff.Direction);
        }

        [Fact]
        public void Export_SystemDigital_Has10SceneTriggers()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var triggers = contract.System.Digital.Where(j => j.Name.StartsWith("Scene Trigger")).ToList();
            Assert.Equal(10, triggers.Count);
        }

        [Fact]
        public void Export_SystemDigital_Has10SceneFeedbacks()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var fbs = contract.System.Digital.Where(j => j.Name.StartsWith("Scene Feedback")).ToList();
            Assert.Equal(10, fbs.Count);
        }

        [Fact]
        public void Export_SystemSerial_HasStatus()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var status = contract.System.Serial.First(j => j.Name == "System Status");
            Assert.Equal("output", status.Direction);
        }

        [Fact]
        public void ExportJson_ProducesNonEmptyString()
        {
            var json = _exporter.ExportJson(CreateTwoRoomConfig());
            Assert.False(string.IsNullOrWhiteSpace(json));
            Assert.Contains("master", json);
            Assert.Contains("living", json);
        }

        [Fact]
        public void Export_NoRooms_ReturnsEmptyRoomsList()
        {
            var config = CreateTwoRoomConfig();
            config.Rooms = new List<RoomConfig>();
            var contract = _exporter.Export(config);
            Assert.Empty(contract.Rooms);
        }

        [Fact]
        public void Export_NullConfig_Throws()
        {
            Assert.Throws<System.ArgumentNullException>(() => _exporter.Export(null!));
        }

        [Fact]
        public void Export_RoomJoins_NoDuplicateJoinNumbers()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            foreach (var room in contract.Rooms)
            {
                var digitalJoins = room.Joins.Digital.Select(j => j.Join).ToList();
                Assert.Equal(digitalJoins.Count, digitalJoins.Distinct().Count());

                var analogJoins = room.Joins.Analog.Select(j => j.Join).ToList();
                Assert.Equal(analogJoins.Count, analogJoins.Distinct().Count());

                var serialJoins = room.Joins.Serial.Select(j => j.Join).ToList();
                Assert.Equal(serialJoins.Count, serialJoins.Distinct().Count());
            }
        }

        [Fact]
        public void Export_RoomJoins_DontOverlapBetweenRooms()
        {
            var contract = _exporter.Export(CreateTwoRoomConfig());
            var room0Digitals = contract.Rooms[0].Joins.Digital.Select(j => j.Join).ToHashSet();
            var room1Digitals = contract.Rooms[1].Joins.Digital.Select(j => j.Join).ToHashSet();
            Assert.Empty(room0Digitals.Intersect(room1Digitals));
        }
    }
}
