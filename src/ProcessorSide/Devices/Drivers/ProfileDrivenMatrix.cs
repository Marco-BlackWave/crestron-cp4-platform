using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Generic matrix switcher driver that reads routing commands from a device profile.
    /// Supports template-based route/mute commands with {input}/{output} placeholders.
    /// Covers Wyrestorm, Lightware, AV Pro Edge, Autopatch, and similar.
    /// </summary>
    public sealed class ProfileDrivenMatrix : IMatrixDriver
    {
        private readonly DeviceProfile _profile;
        private readonly string _protocol;
        private readonly ILogger _logger;
        private ITransport _transport;
        private Dictionary<string, string> _commands;
        private readonly int[] _currentRoutes;
        private string _routeTemplate;
        private string _muteTemplate;
        private Regex _feedbackRegex;
        private bool _disposed;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;
        public int InputCount { get; private set; }
        public int OutputCount { get; private set; }

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public ProfileDrivenMatrix(string deviceId, DeviceProfile profile, string protocol, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _profile = profile ?? throw new ArgumentNullException(nameof(profile));
            _protocol = (protocol ?? "tcp").ToLowerInvariant();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            LoadMatrixConfig();
            _currentRoutes = new int[OutputCount + 1]; // 1-based indexing
            LoadCommands();
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("Matrix initialized: " + DeviceId + " (" + InputCount + "x" + OutputCount + ") via " + _protocol);
        }

        public void Route(int input, int output)
        {
            if (input < 1 || output < 1 || output > OutputCount) return;

            if (_routeTemplate != null)
            {
                var cmd = _routeTemplate.Replace("{input}", input.ToString()).Replace("{output}", output.ToString());
                _transport?.Send(cmd);
            }
            else
            {
                var key = "route_" + input + "_" + output;
                SendCommand(key);
            }

            _currentRoutes[output] = input;
            RaiseFeedback("route_output" + output, input);
            _logger.Info(DeviceId + ": routed input " + input + " → output " + output);
        }

        public void RouteAll(int input)
        {
            for (int output = 1; output <= OutputCount; output++)
            {
                Route(input, output);
            }
        }

        public int GetCurrentRoute(int output)
        {
            if (output < 1 || output > OutputCount) return 0;
            return _currentRoutes[output];
        }

        public void Mute(int output)
        {
            if (output < 1 || output > OutputCount) return;

            if (_muteTemplate != null)
            {
                var cmd = _muteTemplate.Replace("{output}", output.ToString());
                _transport?.Send(cmd);
            }
            else
            {
                SendCommand("mute_" + output);
            }

            _currentRoutes[output] = 0;
            RaiseFeedback("route_output" + output, 0);
        }

        private void LoadMatrixConfig()
        {
            InputCount = 8;
            OutputCount = 8;

            if (_profile.Matrix != null)
            {
                InputCount = _profile.Matrix.Inputs > 0 ? _profile.Matrix.Inputs : 8;
                OutputCount = _profile.Matrix.Outputs > 0 ? _profile.Matrix.Outputs : 8;
                _routeTemplate = _profile.Matrix.RouteCommandTemplate;
                _muteTemplate = _profile.Matrix.MuteCommandTemplate;

                if (!string.IsNullOrEmpty(_profile.Matrix.FeedbackPattern))
                {
                    try { _feedbackRegex = new Regex(_profile.Matrix.FeedbackPattern); }
                    catch { _logger.Warn(DeviceId + ": invalid feedback regex"); }
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
            if (e.Data == null || _feedbackRegex == null) return;

            try
            {
                var match = _feedbackRegex.Match(e.Data);
                if (match.Success && match.Groups.Count >= 3)
                {
                    if (int.TryParse(match.Groups[1].Value, out var input) &&
                        int.TryParse(match.Groups[2].Value, out var output))
                    {
                        if (output >= 1 && output <= OutputCount)
                        {
                            _currentRoutes[output] = input;
                            RaiseFeedback("route_output" + output, input);
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
