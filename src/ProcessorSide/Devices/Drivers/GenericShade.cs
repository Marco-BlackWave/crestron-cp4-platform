using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Generic shade driver that sends open/close/stop commands via any transport.
    /// Supports profile-driven commands for Somfy, Hunter Douglas, Lutron Sivoia, etc.
    /// </summary>
    public sealed class GenericShade : IShadeDriver
    {
        private readonly DeviceProfile _profile;
        private readonly string _protocol;
        private readonly ILogger _logger;
        private ITransport _transport;
        private Dictionary<string, string> _commands;
        private readonly Dictionary<string, int> _positions = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        private bool _disposed;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public GenericShade(string deviceId, DeviceProfile profile, string protocol, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _profile = profile;
            _protocol = (protocol ?? "ir").ToLowerInvariant();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            LoadCommands();
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("Shade initialized: " + DeviceId + " via " + _protocol);
        }

        public void Open(string shadeId)
        {
            SendCommand("open");
            _positions[shadeId ?? "default"] = 100;
            RaiseFeedback("position:" + (shadeId ?? "default"), 100);
        }

        public void Close(string shadeId)
        {
            SendCommand("close");
            _positions[shadeId ?? "default"] = 0;
            RaiseFeedback("position:" + (shadeId ?? "default"), 0);
        }

        public void Stop(string shadeId)
        {
            SendCommand("stop");
        }

        public void SetPosition(string shadeId, int percent)
        {
            percent = Math.Max(0, Math.Min(100, percent));
            if (_commands != null && _commands.TryGetValue("setPosition", out var command))
            {
                var formatted = command.Replace("{percent}", percent.ToString());
                _transport?.Send(formatted);
            }
            _positions[shadeId ?? "default"] = percent;
            RaiseFeedback("position:" + (shadeId ?? "default"), percent);
        }

        public int GetPosition(string shadeId)
        {
            _positions.TryGetValue(shadeId ?? "default", out var pos);
            return pos;
        }

        private void LoadCommands()
        {
            _commands = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            if (_profile?.Protocols == null) return;

            Dictionary<string, string> sourceCommands = null;

            switch (_protocol)
            {
                case "ir":
                    sourceCommands = _profile.Protocols.Ir?.Commands;
                    break;
                case "serial":
                    sourceCommands = _profile.Protocols.Serial?.Commands;
                    break;
                case "ip":
                case "tcp":
                    sourceCommands = _profile.Protocols.Ip?.Commands;
                    break;
            }

            if (sourceCommands != null)
            {
                foreach (var kvp in sourceCommands)
                {
                    _commands[kvp.Key] = kvp.Value;
                }
            }
        }

        private bool SendCommand(string commandKey)
        {
            if (_transport == null || _commands == null || !_commands.TryGetValue(commandKey, out var command))
            {
                return false;
            }
            _transport.Send(command);
            return true;
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            // Parse feedback if available
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
