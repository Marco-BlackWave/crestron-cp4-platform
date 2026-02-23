using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Infrastructure;

namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Loads device profile JSON files from the devices directory.
    /// Each profile defines commands per protocol for a specific device model.
    /// </summary>
    public sealed class DeviceProfileLoader
    {
        private readonly IFileSystem _fileSystem;
        private readonly ILogger _logger;
        private readonly Dictionary<string, DeviceProfile> _profiles = new Dictionary<string, DeviceProfile>(StringComparer.OrdinalIgnoreCase);

        public DeviceProfileLoader(IFileSystem fileSystem, ILogger logger)
        {
            _fileSystem = fileSystem ?? throw new ArgumentNullException(nameof(fileSystem));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void LoadFromDirectory(string basePath)
        {
            _logger.Info("Loading device profiles from: " + basePath);
            // On Crestron, we iterate known subdirectories
            var categories = new[] { "displays", "audio", "sources", "lighting", "shades", "hvac", "security", "marine", "matrices", "projectors", "dsp", "streaming", "smart-home", "protocol", "knx" };
            foreach (var category in categories)
            {
                var categoryPath = basePath + "/" + category;
                LoadCategoryProfiles(categoryPath);
            }
            _logger.Info("Loaded " + _profiles.Count + " device profiles.");
        }

        public void LoadProfile(string filePath)
        {
            if (!_fileSystem.FileExists(filePath))
            {
                _logger.Warn("Profile not found: " + filePath);
                return;
            }

            try
            {
                var json = _fileSystem.ReadAllText(filePath);
                var settings = new DataContractJsonSerializerSettings
                {
                    UseSimpleDictionaryFormat = true
                };
                var serializer = new DataContractJsonSerializer(typeof(DeviceProfile), settings);
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                {
                    var profile = (DeviceProfile)serializer.ReadObject(stream);
                    if (profile != null && !string.IsNullOrWhiteSpace(profile.Id))
                    {
                        _profiles[profile.Id] = profile;
                        _logger.Info("Loaded profile: " + profile.Id + " (" + profile.Manufacturer + " " + profile.Model + ")");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to load profile " + filePath + ": " + ex.Message);
            }
        }

        public DeviceProfile GetProfile(string profileId)
        {
            if (string.IsNullOrWhiteSpace(profileId)) return null;
            _profiles.TryGetValue(profileId, out var profile);
            return profile;
        }

        public IEnumerable<DeviceProfile> AllProfiles => _profiles.Values;

        private void LoadCategoryProfiles(string categoryPath)
        {
            // In production, enumerate JSON files from Crestron file system
            // For now, profiles are loaded explicitly via LoadProfile()
        }
    }

    // Device profile data models

    [DataContract]
    public sealed class DeviceProfile
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "manufacturer")] public string Manufacturer { get; set; }
        [DataMember(Name = "model")] public string Model { get; set; }
        [DataMember(Name = "category")] public string Category { get; set; }
        [DataMember(Name = "protocols")] public ProtocolSet Protocols { get; set; }
        [DataMember(Name = "capabilities")] public DeviceCapabilities Capabilities { get; set; }
        [DataMember(Name = "matrix")] public MatrixConfig Matrix { get; set; }
        [DataMember(Name = "dsp")] public DspConfig Dsp { get; set; }
        [DataMember(Name = "media")] public MediaConfig Media { get; set; }
        [DataMember(Name = "gateway")] public GatewayConfig Gateway { get; set; }
        [DataMember(Name = "feedbackRules")] public List<FeedbackRule> FeedbackRules { get; set; }
        [DataMember(Name = "sourceModule")] public string SourceModule { get; set; }
    }

    [DataContract]
    public sealed class ProtocolSet
    {
        [DataMember(Name = "ir")] public IrProtocol Ir { get; set; }
        [DataMember(Name = "serial")] public SerialProtocol Serial { get; set; }
        [DataMember(Name = "ip")] public IpProtocol Ip { get; set; }
    }

    [DataContract]
    public sealed class IrProtocol
    {
        [DataMember(Name = "driverFile")] public string DriverFile { get; set; }
        [DataMember(Name = "commands")] public Dictionary<string, string> Commands { get; set; }
    }

    [DataContract]
    public sealed class SerialProtocol
    {
        [DataMember(Name = "baudRate")] public int BaudRate { get; set; }
        [DataMember(Name = "dataBits")] public int DataBits { get; set; }
        [DataMember(Name = "parity")] public string Parity { get; set; }
        [DataMember(Name = "stopBits")] public int StopBits { get; set; }
        [DataMember(Name = "commands")] public Dictionary<string, string> Commands { get; set; }
        [DataMember(Name = "feedback")] public Dictionary<string, FeedbackDef> Feedback { get; set; }
    }

    [DataContract]
    public sealed class FeedbackDef
    {
        [DataMember(Name = "poll")] public string Poll { get; set; }
        [DataMember(Name = "on")] public string On { get; set; }
        [DataMember(Name = "off")] public string Off { get; set; }
    }

    [DataContract]
    public sealed class IpProtocol
    {
        [DataMember(Name = "port")] public int Port { get; set; }
        [DataMember(Name = "type")] public string Type { get; set; }
        [DataMember(Name = "commands")] public Dictionary<string, string> Commands { get; set; }
    }

    [DataContract]
    public sealed class DeviceCapabilities
    {
        [DataMember(Name = "discretePower")] public bool DiscretePower { get; set; }
        [DataMember(Name = "volumeControl")] public bool VolumeControl { get; set; }
        [DataMember(Name = "inputSelect")] public bool InputSelect { get; set; }
        [DataMember(Name = "feedback")] public bool Feedback { get; set; }
        [DataMember(Name = "warmupMs")] public int WarmupMs { get; set; }
        [DataMember(Name = "cooldownMs")] public int CooldownMs { get; set; }
    }

    // Extended profile sections for matrix, DSP, media, and gateway devices

    [DataContract]
    public sealed class MatrixConfig
    {
        [DataMember(Name = "inputs")] public int Inputs { get; set; }
        [DataMember(Name = "outputs")] public int Outputs { get; set; }
        [DataMember(Name = "routeCommandTemplate")] public string RouteCommandTemplate { get; set; }
        [DataMember(Name = "muteCommandTemplate")] public string MuteCommandTemplate { get; set; }
        [DataMember(Name = "feedbackPattern")] public string FeedbackPattern { get; set; }
    }

    [DataContract]
    public sealed class DspConfig
    {
        [DataMember(Name = "maxChannels")] public int MaxChannels { get; set; }
        [DataMember(Name = "objectIdFormat")] public string ObjectIdFormat { get; set; }
        [DataMember(Name = "levelCommandTemplate")] public string LevelCommandTemplate { get; set; }
        [DataMember(Name = "muteCommandTemplate")] public string MuteCommandTemplate { get; set; }
        [DataMember(Name = "subscribeCommandTemplate")] public string SubscribeCommandTemplate { get; set; }
        [DataMember(Name = "unsubscribeCommandTemplate")] public string UnsubscribeCommandTemplate { get; set; }
    }

    [DataContract]
    public sealed class MediaConfig
    {
        [DataMember(Name = "transportCommands")] public Dictionary<string, string> TransportCommands { get; set; }
        [DataMember(Name = "nowPlayingFeedback")] public NowPlayingFeedback NowPlayingFeedback { get; set; }
    }

    [DataContract]
    public sealed class NowPlayingFeedback
    {
        [DataMember(Name = "trackPattern")] public string TrackPattern { get; set; }
        [DataMember(Name = "artistPattern")] public string ArtistPattern { get; set; }
        [DataMember(Name = "albumPattern")] public string AlbumPattern { get; set; }
        [DataMember(Name = "positionPattern")] public string PositionPattern { get; set; }
        [DataMember(Name = "durationPattern")] public string DurationPattern { get; set; }
    }

    [DataContract]
    public sealed class GatewayConfig
    {
        [DataMember(Name = "objects")] public List<GatewayObject> Objects { get; set; }
    }

    [DataContract]
    public sealed class GatewayObject
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "type")] public string Type { get; set; }
        [DataMember(Name = "dataType")] public string DataType { get; set; }
    }

    [DataContract]
    public sealed class FeedbackRule
    {
        [DataMember(Name = "pattern")] public string Pattern { get; set; }
        [DataMember(Name = "signal")] public string Signal { get; set; }
        [DataMember(Name = "transform")] public string Transform { get; set; }
        [DataMember(Name = "value")] public object Value { get; set; }
    }
}
