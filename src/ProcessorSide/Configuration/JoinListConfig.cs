using System.Collections.Generic;
using System.Runtime.Serialization;

namespace CrestronCP4.ProcessorSide.Configuration
{
    [DataContract]
    public sealed class JoinListConfig
    {
        [DataMember(Name = "schemaVersion")] public string SchemaVersion { get; set; }
        [DataMember(Name = "projectId")] public string ProjectId { get; set; }
        [DataMember(Name = "processor")] public string Processor { get; set; }
        [DataMember(Name = "debugMode")] public bool? DebugMode { get; set; }
        [DataMember(Name = "joins")] public JoinListJoins Joins { get; set; }
    }

    [DataContract]
    public sealed class JoinListJoins
    {
        [DataMember(Name = "digital")] public List<JoinEntry> Digital { get; set; }
        [DataMember(Name = "analog")] public List<JoinEntry> Analog { get; set; }
        [DataMember(Name = "serial")] public List<JoinEntry> Serial { get; set; }
    }

    [DataContract]
    public sealed class JoinEntry
    {
        [DataMember(Name = "join")] public ushort Join { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "direction")] public string Direction { get; set; }
    }
}
