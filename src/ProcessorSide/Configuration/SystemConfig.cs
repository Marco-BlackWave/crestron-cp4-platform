using System.Collections.Generic;
using System.Runtime.Serialization;

namespace CrestronCP4.ProcessorSide.Configuration
{
    [DataContract]
    public sealed class SystemConfig
    {
        [DataMember(Name = "schemaVersion")] public string SchemaVersion { get; set; }
        [DataMember(Name = "projectId")] public string ProjectId { get; set; }
        [DataMember(Name = "processor")] public string Processor { get; set; }
        [DataMember(Name = "system")] public SystemInfo System { get; set; }
        [DataMember(Name = "rooms")] public List<RoomConfig> Rooms { get; set; }
        [DataMember(Name = "sources")] public List<SourceConfig> Sources { get; set; }
        [DataMember(Name = "scenes")] public List<SceneConfig> Scenes { get; set; }
    }

    [DataContract]
    public sealed class SystemInfo
    {
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "eiscIpId")] public string EiscIpId { get; set; }
        [DataMember(Name = "eiscIpAddress")] public string EiscIpAddress { get; set; }
    }

    [DataContract]
    public sealed class RoomConfig
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "joinOffset")] public int JoinOffset { get; set; }
        [DataMember(Name = "subsystems")] public List<string> Subsystems { get; set; }
        [DataMember(Name = "devices")] public Dictionary<string, DeviceAssignment> Devices { get; set; }
        [DataMember(Name = "sources")] public List<string> Sources { get; set; }
    }

    [DataContract]
    public sealed class DeviceAssignment
    {
        [DataMember(Name = "profileId")] public string ProfileId { get; set; }
        [DataMember(Name = "protocol")] public string Protocol { get; set; }
        [DataMember(Name = "port")] public string Port { get; set; }
        [DataMember(Name = "address")] public string Address { get; set; }
        [DataMember(Name = "objectId")] public int ObjectId { get; set; }
    }

    [DataContract]
    public sealed class SourceConfig
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "type")] public string Type { get; set; }
    }

    [DataContract]
    public sealed class SceneConfig
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "rooms")] public List<string> Rooms { get; set; }
        [DataMember(Name = "actions")] public SceneActions Actions { get; set; }
    }

    [DataContract]
    public sealed class SceneActions
    {
        [DataMember(Name = "lighting")] public int Lighting { get; set; }
        [DataMember(Name = "shades")] public string Shades { get; set; }
        [DataMember(Name = "source")] public string Source { get; set; }
        [DataMember(Name = "av")] public string Av { get; set; }
        [DataMember(Name = "security")] public string Security { get; set; }
    }
}
