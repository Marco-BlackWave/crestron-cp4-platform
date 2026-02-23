using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Generic DSP driver that reads level/mute commands from a device profile.
    /// Uses template-based commands with {objectId}/{channel}/{level}/{muted} placeholders.
    /// Covers simple DSP control; use BssSoundwebDriver for HiQnet binary protocol.
    /// </summary>
    public sealed class ProfileDrivenDsp : IDspDriver
    {
        private readonly DeviceProfile _profile;
        private readonly string _protocol;
        private readonly ILogger _logger;
        private ITransport _transport;
        private Dictionary<string, string> _commands;
        private readonly Dictionary<int, int> _levels = new Dictionary<int, int>();
        private readonly HashSet<int> _subscribedChannels = new HashSet<int>();
        private string _levelTemplate;
        private string _muteTemplate;
        private string _subscribeTemplate;
        private string _unsubscribeTemplate;
        private bool _disposed;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public ProfileDrivenDsp(string deviceId, DeviceProfile profile, string protocol, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _profile = profile ?? throw new ArgumentNullException(nameof(profile));
            _protocol = (protocol ?? "tcp").ToLowerInvariant();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            LoadDspConfig();
            LoadCommands();
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("DSP initialized: " + DeviceId + " via " + _protocol);
        }

        public void SetLevel(int channel, int level)
        {
            if (_levelTemplate != null)
            {
                var cmd = _levelTemplate
                    .Replace("{channel}", channel.ToString())
                    .Replace("{level}", level.ToString());
                _transport?.Send(cmd);
            }
            else
            {
                SendCommand("level_" + channel + "_" + level);
            }

            _levels[channel] = level;
            RaiseFeedback("level_ch" + channel, level);
        }

        public void SetMute(int channel, bool muted)
        {
            if (_muteTemplate != null)
            {
                var cmd = _muteTemplate
                    .Replace("{channel}", channel.ToString())
                    .Replace("{muted}", muted ? "1" : "0");
                _transport?.Send(cmd);
            }
            else
            {
                SendCommand(muted ? "mute_" + channel : "unmute_" + channel);
            }

            RaiseFeedback("mute_ch" + channel, muted);
        }

        public int GetLevel(int channel)
        {
            _levels.TryGetValue(channel, out var level);
            return level;
        }

        public void Subscribe(int channel)
        {
            _subscribedChannels.Add(channel);
            if (_subscribeTemplate != null)
            {
                var cmd = _subscribeTemplate.Replace("{channel}", channel.ToString());
                _transport?.Send(cmd);
            }
            else
            {
                SendCommand("subscribe_" + channel);
            }
        }

        public void Unsubscribe(int channel)
        {
            _subscribedChannels.Remove(channel);
            if (_unsubscribeTemplate != null)
            {
                var cmd = _unsubscribeTemplate.Replace("{channel}", channel.ToString());
                _transport?.Send(cmd);
            }
            else
            {
                SendCommand("unsubscribe_" + channel);
            }
        }

        private void LoadDspConfig()
        {
            if (_profile.Dsp != null)
            {
                _levelTemplate = _profile.Dsp.LevelCommandTemplate;
                _muteTemplate = _profile.Dsp.MuteCommandTemplate;
                _subscribeTemplate = _profile.Dsp.SubscribeCommandTemplate;
                _unsubscribeTemplate = _profile.Dsp.UnsubscribeCommandTemplate;
            }
        }

        private void LoadCommands()
        {
            _commands = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (_profile.Protocols == null) return;

            Dictionary<string, string> source = null;
            switch (_protocol)
            {
                case "serial": source = _profile.Protocols.Serial?.Commands; break;
                case "ip": case "tcp": source = _profile.Protocols.Ip?.Commands; break;
            }

            if (source != null)
            {
                foreach (var kvp in source)
                    _commands[kvp.Key] = kvp.Value;
            }
        }

        private bool SendCommand(string commandKey)
        {
            if (_transport == null || !_commands.TryGetValue(commandKey, out var command))
                return false;
            _transport.Send(command);
            return true;
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.Data == null) return;

            try
            {
                // Parse level feedback: e.g. "LV 1 -10.5" or "LEVEL:1:50"
                ParseFeedbackRules(e.Data);
            }
            catch (Exception ex)
            {
                _logger.Error(DeviceId + " feedback parse error: " + ex.Message);
            }
        }

        private void ParseFeedbackRules(string data)
        {
            if (_profile.FeedbackRules == null) return;

            foreach (var rule in _profile.FeedbackRules)
            {
                if (string.IsNullOrEmpty(rule.Pattern)) continue;

                try
                {
                    var match = System.Text.RegularExpressions.Regex.Match(data, rule.Pattern);
                    if (match.Success)
                    {
                        if (rule.Value != null)
                        {
                            RaiseFeedback(rule.Signal, rule.Value);
                        }
                        else if (match.Groups.Count > 1 && rule.Transform == "parseInt")
                        {
                            if (int.TryParse(match.Groups[1].Value, out var val))
                                RaiseFeedback(rule.Signal, val);
                        }
                        else if (match.Groups.Count > 1)
                        {
                            RaiseFeedback(rule.Signal, match.Groups[1].Value);
                        }
                    }
                }
                catch { /* Skip malformed regex rules */ }
            }
        }

        private void RaiseFeedback(string property, object value)
        {
            FeedbackReceived?.Invoke(this, new DeviceFeedbackEventArgs(property, value));
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _subscribedChannels.Clear();
            if (_transport != null)
            {
                _transport.DataReceived -= OnDataReceived;
                _transport.Disconnect();
            }
        }
    }
}
