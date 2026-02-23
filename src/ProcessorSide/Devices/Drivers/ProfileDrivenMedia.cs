using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Generic media/streaming driver that reads transport commands from a device profile.
    /// Covers Apple TV (IR), Roku, Kaleidescape, generic IR sources, and similar.
    /// </summary>
    public sealed class ProfileDrivenMedia : IMediaDriver
    {
        private readonly DeviceProfile _profile;
        private readonly string _protocol;
        private readonly ILogger _logger;
        private ITransport _transport;
        private Dictionary<string, string> _commands;
        private Regex _trackRegex;
        private Regex _artistRegex;
        private bool _disposed;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;
        public bool IsPlaying { get; private set; }
        public string TrackName { get; private set; } = "";
        public string Artist { get; private set; } = "";
        public string Album { get; private set; } = "";
        public int Position { get; private set; }
        public int Duration { get; private set; }

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public ProfileDrivenMedia(string deviceId, DeviceProfile profile, string protocol, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _profile = profile ?? throw new ArgumentNullException(nameof(profile));
            _protocol = (protocol ?? "ir").ToLowerInvariant();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            LoadMediaConfig();
            LoadCommands();
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("Media initialized: " + DeviceId + " via " + _protocol);
        }

        public void Play()
        {
            if (SendMediaCommand("play"))
            {
                IsPlaying = true;
                RaiseFeedback("isPlaying", true);
            }
        }

        public void Pause()
        {
            if (SendMediaCommand("pause"))
            {
                IsPlaying = false;
                RaiseFeedback("isPlaying", false);
            }
        }

        public void Stop()
        {
            if (SendMediaCommand("stop"))
            {
                IsPlaying = false;
                Position = 0;
                RaiseFeedback("isPlaying", false);
            }
        }

        public void Next() => SendMediaCommand("next");
        public void Previous() => SendMediaCommand("previous");

        public void Seek(int position)
        {
            if (_commands.TryGetValue("seek", out var template))
            {
                var cmd = template.Replace("{position}", position.ToString());
                _transport?.Send(cmd);
                Position = position;
                RaiseFeedback("position", position);
            }
        }

        private bool SendMediaCommand(string action)
        {
            // First try profile media transport commands
            if (_profile.Media?.TransportCommands != null &&
                _profile.Media.TransportCommands.TryGetValue(action, out var mediaCmd))
            {
                _transport?.Send(mediaCmd);
                return true;
            }

            // Fallback to generic command lookup
            return SendCommand(action);
        }

        private void LoadMediaConfig()
        {
            if (_profile.Media?.NowPlayingFeedback != null)
            {
                var npf = _profile.Media.NowPlayingFeedback;
                if (!string.IsNullOrEmpty(npf.TrackPattern))
                {
                    try { _trackRegex = new Regex(npf.TrackPattern); } catch { }
                }
                if (!string.IsNullOrEmpty(npf.ArtistPattern))
                {
                    try { _artistRegex = new Regex(npf.ArtistPattern); } catch { }
                }
            }
        }

        private void LoadCommands()
        {
            _commands = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (_profile.Protocols == null) return;

            Dictionary<string, string> source = null;
            switch (_protocol)
            {
                case "ir": source = _profile.Protocols.Ir?.Commands; break;
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
                if (_trackRegex != null)
                {
                    var match = _trackRegex.Match(e.Data);
                    if (match.Success && match.Groups.Count > 1)
                    {
                        TrackName = match.Groups[1].Value;
                        RaiseFeedback("trackName", TrackName);
                    }
                }

                if (_artistRegex != null)
                {
                    var match = _artistRegex.Match(e.Data);
                    if (match.Success && match.Groups.Count > 1)
                    {
                        Artist = match.Groups[1].Value;
                        RaiseFeedback("artist", Artist);
                    }
                }

                // Parse generic feedback rules
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
                    var match = Regex.Match(data, rule.Pattern);
                    if (match.Success)
                    {
                        if (rule.Value != null)
                            RaiseFeedback(rule.Signal, rule.Value);
                        else if (match.Groups.Count > 1)
                            RaiseFeedback(rule.Signal, match.Groups[1].Value);
                    }
                }
                catch { }
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
            if (_transport != null)
            {
                _transport.DataReceived -= OnDataReceived;
                _transport.Disconnect();
            }
        }
    }
}
