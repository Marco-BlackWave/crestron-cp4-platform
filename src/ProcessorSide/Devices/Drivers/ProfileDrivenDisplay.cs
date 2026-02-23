using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Generic display driver that reads commands from a device profile JSON.
    /// Works with any protocol (IR, serial, TCP) via ITransport.
    /// </summary>
    public sealed class ProfileDrivenDisplay : IDisplayDriver
    {
        private readonly DeviceProfile _profile;
        private readonly string _protocol;
        private readonly ILogger _logger;
        private ITransport _transport;
        private Dictionary<string, string> _commands;
        private bool _disposed;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;
        public bool IsPoweredOn { get; private set; }

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public ProfileDrivenDisplay(string deviceId, DeviceProfile profile, string protocol, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _profile = profile ?? throw new ArgumentNullException(nameof(profile));
            _protocol = (protocol ?? "ir").ToLowerInvariant();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            LoadCommands();
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("Display initialized: " + DeviceId + " via " + _protocol);
        }

        public void PowerOn()
        {
            SendCommand("powerOn");
            IsPoweredOn = true;
            RaiseFeedback("power", true);
        }

        public void PowerOff()
        {
            SendCommand("powerOff");
            IsPoweredOn = false;
            RaiseFeedback("power", false);
        }

        public void SelectInput(string inputId)
        {
            var commandKey = "input_" + inputId;
            if (!SendCommand(commandKey))
            {
                _logger.Warn("Display " + DeviceId + ": unknown input " + inputId);
            }
        }

        private void LoadCommands()
        {
            _commands = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            if (_profile.Protocols == null) return;

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
            if (_transport == null || !_commands.TryGetValue(commandKey, out var command))
            {
                return false;
            }

            _transport.Send(command);
            return true;
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            // Parse feedback based on protocol-specific patterns
            if (_profile.Protocols?.Serial?.Feedback != null && e.Data != null)
            {
                foreach (var fb in _profile.Protocols.Serial.Feedback)
                {
                    if (fb.Value.On != null && e.Data.Contains(fb.Value.On))
                    {
                        if (fb.Key == "powerState")
                        {
                            IsPoweredOn = true;
                            RaiseFeedback("power", true);
                        }
                    }
                    else if (fb.Value.Off != null && e.Data.Contains(fb.Value.Off))
                    {
                        if (fb.Key == "powerState")
                        {
                            IsPoweredOn = false;
                            RaiseFeedback("power", false);
                        }
                    }
                }
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
