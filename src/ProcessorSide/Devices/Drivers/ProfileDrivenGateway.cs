using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Generic gateway driver for KNX objects, Shelly devices, and similar multi-point systems.
    /// Commands are routed by objectId to the underlying protocol client.
    /// </summary>
    public sealed class ProfileDrivenGateway : IGatewayDriver
    {
        private readonly DeviceProfile _profile;
        private readonly string _protocol;
        private readonly ILogger _logger;
        private ITransport _transport;
        private Dictionary<string, string> _commands;
        private readonly HashSet<string> _subscribedObjects = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        private bool _disposed;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public ProfileDrivenGateway(string deviceId, DeviceProfile profile, string protocol, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _profile = profile ?? throw new ArgumentNullException(nameof(profile));
            _protocol = (protocol ?? "tcp").ToLowerInvariant();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            LoadCommands();
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("Gateway initialized: " + DeviceId + " via " + _protocol);
        }

        public void SendCommand(string objectId, string command, string value)
        {
            if (string.IsNullOrEmpty(objectId)) return;

            // Try profile command template first
            var cmdKey = objectId + "_" + command;
            if (_commands.TryGetValue(cmdKey, out var template))
            {
                var cmd = template.Replace("{value}", value ?? "");
                _transport?.Send(cmd);
            }
            else if (_commands.TryGetValue(command, out var genericCmd))
            {
                var cmd = genericCmd
                    .Replace("{objectId}", objectId)
                    .Replace("{value}", value ?? "");
                _transport?.Send(cmd);
            }
            else
            {
                _logger.Warn(DeviceId + ": unknown command " + command + " for object " + objectId);
            }

            RaiseFeedback(objectId + ":" + command, value);
        }

        public void Subscribe(string objectId)
        {
            if (string.IsNullOrEmpty(objectId)) return;
            _subscribedObjects.Add(objectId);

            if (_commands.TryGetValue("subscribe", out var template))
            {
                var cmd = template.Replace("{objectId}", objectId);
                _transport?.Send(cmd);
            }

            _logger.Info(DeviceId + ": subscribed to " + objectId);
        }

        public void Poll(string objectId)
        {
            if (string.IsNullOrEmpty(objectId)) return;

            if (_commands.TryGetValue("poll", out var template))
            {
                var cmd = template.Replace("{objectId}", objectId);
                _transport?.Send(cmd);
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

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.Data == null) return;

            try
            {
                ParseFeedbackRules(e.Data);
            }
            catch (Exception ex)
            {
                _logger.Error(DeviceId + " gateway feedback error: " + ex.Message);
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
            _subscribedObjects.Clear();
            if (_transport != null)
            {
                _transport.DataReceived -= OnDataReceived;
                _transport.Disconnect();
            }
        }
    }
}
