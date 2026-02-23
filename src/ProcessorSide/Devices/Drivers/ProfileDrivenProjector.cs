using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Generic projector driver that reads commands from a device profile.
    /// Extends display functionality with lens, freeze, blank, and lamp hours.
    /// Covers Epson, Optoma, generic PJLink, and similar projectors.
    /// </summary>
    public sealed class ProfileDrivenProjector : IProjectorDriver
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
        public int LampHours { get; private set; }

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public ProfileDrivenProjector(string deviceId, DeviceProfile profile, string protocol, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _profile = profile ?? throw new ArgumentNullException(nameof(profile));
            _protocol = (protocol ?? "serial").ToLowerInvariant();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            LoadCommands();
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("Projector initialized: " + DeviceId + " via " + _protocol);
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
            var key = "input_" + inputId;
            if (!SendCommand(key))
                _logger.Warn("Projector " + DeviceId + ": unknown input " + inputId);
        }

        public void SetLensPosition(int position)
        {
            // Try template command first, then discrete
            if (_commands.TryGetValue("lensPosition", out var template))
            {
                _transport?.Send(template.Replace("{position}", position.ToString()));
            }
            else
            {
                SendCommand("lens_" + position);
            }
            RaiseFeedback("lensPosition", position);
        }

        public void Freeze()
        {
            SendCommand("freeze");
            RaiseFeedback("freeze", true);
        }

        public void Blank()
        {
            SendCommand("blank");
            RaiseFeedback("blank", true);
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
                case "ir": source = _profile.Protocols.Ir?.Commands; break;
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
                // PJLink-style lamp hours feedback: %1LAMP=12345
                if (e.Data.Contains("LAMP="))
                {
                    var idx = e.Data.IndexOf("LAMP=") + 5;
                    var end = e.Data.IndexOf(' ', idx);
                    var hoursStr = end > idx ? e.Data.Substring(idx, end - idx) : e.Data.Substring(idx);
                    if (int.TryParse(hoursStr, out var hours))
                    {
                        LampHours = hours;
                        RaiseFeedback("lampHours", hours);
                    }
                }

                // Power feedback
                if (_profile.Protocols?.Serial?.Feedback != null)
                {
                    foreach (var fb in _profile.Protocols.Serial.Feedback)
                    {
                        if (fb.Value.On != null && e.Data.Contains(fb.Value.On))
                        {
                            if (fb.Key == "powerState") { IsPoweredOn = true; RaiseFeedback("power", true); }
                        }
                        else if (fb.Value.Off != null && e.Data.Contains(fb.Value.Off))
                        {
                            if (fb.Key == "powerState") { IsPoweredOn = false; RaiseFeedback("power", false); }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.Error(DeviceId + " feedback parse error: " + ex.Message);
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
