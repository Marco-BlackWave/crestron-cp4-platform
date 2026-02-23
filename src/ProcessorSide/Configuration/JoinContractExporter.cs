using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;

namespace CrestronCP4.ProcessorSide.Configuration
{
    public sealed class JoinContractExporter
    {
        public JoinContract Export(SystemConfig config)
        {
            if (config == null) throw new ArgumentNullException(nameof(config));

            var contract = new JoinContract
            {
                Version = "1.0",
                GeneratedAt = DateTime.UtcNow.ToString("o"),
                Rooms = new List<RoomJoinContract>(),
                System = new SystemJoinContract
                {
                    Digital = BuildSystemDigitalJoins(),
                    Serial = BuildSystemSerialJoins()
                }
            };

            if (config.Rooms != null)
            {
                foreach (var room in config.Rooms)
                {
                    contract.Rooms.Add(BuildRoomContract(room));
                }
            }

            return contract;
        }

        public string ExportJson(SystemConfig config)
        {
            var contract = Export(config);
            var serializer = new DataContractJsonSerializer(typeof(JoinContract));
            using (var stream = new MemoryStream())
            {
                serializer.WriteObject(stream, contract);
                return Encoding.UTF8.GetString(stream.ToArray());
            }
        }

        private static RoomJoinContract BuildRoomContract(RoomConfig room)
        {
            var roomContract = new RoomJoinContract
            {
                Id = room.Id,
                Name = room.Name,
                Joins = new JoinTypeContract
                {
                    Digital = new List<JoinContractEntry>(),
                    Analog = new List<JoinContractEntry>(),
                    Serial = new List<JoinContractEntry>()
                }
            };

            int offset = room.JoinOffset;

            // Digital joins
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.PowerToggle, "Power Toggle", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.PowerFeedback, "Power Feedback", "output");
            for (int i = 0; i < 5; i++)
            {
                AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SourceSelect1 + i, "Source Select " + (i + 1), "input");
                AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SourceFeedback1 + i, "Source Feedback " + (i + 1), "output");
            }
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.VolumeUp, "Volume Up", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.VolumeDown, "Volume Down", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.MuteToggle, "Mute Toggle", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.MuteFeedback, "Mute Feedback", "output");
            for (int i = 0; i < 4; i++)
            {
                AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.LightingScene1 + i, "Lighting Scene " + (i + 1), "input");
                AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.LightingSceneFb1 + i, "Lighting Scene FB " + (i + 1), "output");
            }
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.ShadeOpen, "Shade Open", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.ShadeClose, "Shade Close", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.ShadeStop, "Shade Stop", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.HvacModeToggle, "HVAC Mode Toggle", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.HvacOnOff, "HVAC On/Off", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityArmAway, "Security Arm Away", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityArmStay, "Security Arm Stay", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityArmNight, "Security Arm Night", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityDisarm, "Security Disarm", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityPanic, "Security Panic", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityStatusRequest, "Security Status Request", "input");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityArmedAwayFb, "Security Armed Away FB", "output");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityArmedStayFb, "Security Armed Stay FB", "output");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityArmedNightFb, "Security Armed Night FB", "output");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityDisarmedFb, "Security Disarmed FB", "output");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityAlarmActiveFb, "Security Alarm Active FB", "output");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityTroubleFb, "Security Trouble FB", "output");
            AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityReadyFb, "Security Ready FB", "output");
            for (int i = 0; i < 8; i++)
            {
                AddJoin(roomContract.Joins.Digital, offset, JoinMap.Digital.SecurityZone1Fb + i, "Security Zone " + (i + 1) + " FB", "output");
            }

            // Analog joins
            AddJoin(roomContract.Joins.Analog, offset, JoinMap.Analog.VolumeLevelFeedback, "Volume Level FB", "output");
            AddJoin(roomContract.Joins.Analog, offset, JoinMap.Analog.VolumeSet, "Volume Set", "input");
            AddJoin(roomContract.Joins.Analog, offset, JoinMap.Analog.LightingLevelFeedback, "Lighting Level FB", "output");
            AddJoin(roomContract.Joins.Analog, offset, JoinMap.Analog.LightingSet, "Lighting Set", "input");
            AddJoin(roomContract.Joins.Analog, offset, JoinMap.Analog.ShadePositionFeedback, "Shade Position FB", "output");
            AddJoin(roomContract.Joins.Analog, offset, JoinMap.Analog.ShadeSet, "Shade Set", "input");
            AddJoin(roomContract.Joins.Analog, offset, JoinMap.Analog.TempCurrent, "Temp Current", "output");
            AddJoin(roomContract.Joins.Analog, offset, JoinMap.Analog.TempSetpointSet, "Temp Setpoint Set", "input");
            AddJoin(roomContract.Joins.Analog, offset, JoinMap.Analog.TempSetpointFeedback, "Temp Setpoint FB", "output");

            // Serial joins
            AddJoin(roomContract.Joins.Serial, offset, JoinMap.Serial.SourceName, "Source Name", "output");
            AddJoin(roomContract.Joins.Serial, offset, JoinMap.Serial.RoomName, "Room Name", "output");
            AddJoin(roomContract.Joins.Serial, offset, JoinMap.Serial.SceneName, "Scene Name", "output");
            AddJoin(roomContract.Joins.Serial, offset, JoinMap.Serial.HvacMode, "HVAC Mode", "output");
            AddJoin(roomContract.Joins.Serial, offset, JoinMap.Serial.StatusText, "Status Text", "output");
            AddJoin(roomContract.Joins.Serial, offset, JoinMap.Serial.SecurityArmMode, "Security Arm Mode", "output");
            AddJoin(roomContract.Joins.Serial, offset, JoinMap.Serial.SecurityStatus, "Security Status", "output");
            AddJoin(roomContract.Joins.Serial, offset, JoinMap.Serial.SecurityDisarmCode, "Security Disarm Code", "input");

            return roomContract;
        }

        private static void AddJoin(List<JoinContractEntry> list, int roomOffset, int joinOffset, string name, string direction)
        {
            list.Add(new JoinContractEntry
            {
                Join = JoinMap.Resolve(roomOffset, joinOffset),
                Name = name,
                Direction = direction
            });
        }

        private static List<JoinContractEntry> BuildSystemDigitalJoins()
        {
            var joins = new List<JoinContractEntry>();
            joins.Add(new JoinContractEntry { Join = JoinMap.ResolveSystem(JoinMap.SystemDigital.AllOff), Name = "All Off", Direction = "input" });
            for (int i = 0; i < 10; i++)
            {
                joins.Add(new JoinContractEntry
                {
                    Join = JoinMap.ResolveSystem(JoinMap.SystemDigital.SceneTrigger1 + i),
                    Name = "Scene Trigger " + (i + 1),
                    Direction = "input"
                });
                joins.Add(new JoinContractEntry
                {
                    Join = JoinMap.ResolveSystem(JoinMap.SystemDigital.SceneFeedback1 + i),
                    Name = "Scene Feedback " + (i + 1),
                    Direction = "output"
                });
            }
            return joins;
        }

        private static List<JoinContractEntry> BuildSystemSerialJoins()
        {
            return new List<JoinContractEntry>
            {
                new JoinContractEntry { Join = JoinMap.ResolveSystem(JoinMap.SystemSerial.SystemStatus), Name = "System Status", Direction = "output" },
                new JoinContractEntry { Join = JoinMap.ResolveSystem(JoinMap.SystemSerial.ActiveSceneName), Name = "Active Scene Name", Direction = "output" }
            };
        }
    }

    // Contract data models

    [DataContract]
    public sealed class JoinContract
    {
        [DataMember(Name = "version")] public string Version { get; set; }
        [DataMember(Name = "generatedAt")] public string GeneratedAt { get; set; }
        [DataMember(Name = "rooms")] public List<RoomJoinContract> Rooms { get; set; }
        [DataMember(Name = "system")] public SystemJoinContract System { get; set; }
    }

    [DataContract]
    public sealed class RoomJoinContract
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "joins")] public JoinTypeContract Joins { get; set; }
    }

    [DataContract]
    public sealed class JoinTypeContract
    {
        [DataMember(Name = "digital")] public List<JoinContractEntry> Digital { get; set; }
        [DataMember(Name = "analog")] public List<JoinContractEntry> Analog { get; set; }
        [DataMember(Name = "serial")] public List<JoinContractEntry> Serial { get; set; }
    }

    [DataContract]
    public sealed class SystemJoinContract
    {
        [DataMember(Name = "digital")] public List<JoinContractEntry> Digital { get; set; }
        [DataMember(Name = "serial")] public List<JoinContractEntry> Serial { get; set; }
    }

    [DataContract]
    public sealed class JoinContractEntry
    {
        [DataMember(Name = "join")] public ushort Join { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "direction")] public string Direction { get; set; }
    }
}
