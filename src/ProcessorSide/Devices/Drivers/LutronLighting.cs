using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Lutron Integration Protocol driver for HomeWorks QS, RadioRA 3, etc.
    /// Uses TCP transport on port 23 with text-based command/response protocol.
    /// Commands: #OUTPUT,id,1,level | ?OUTPUT,id,1
    /// Feedback: ~OUTPUT,id,1,level
    /// </summary>
    public sealed class LutronLighting : ILightingDriver
    {
        private readonly ILogger _logger;
        private ITransport _transport;
        private readonly Dictionary<string, int> _zoneLevels = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        private bool _disposed;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public LutronLighting(string deviceId, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("Lutron lighting initialized: " + DeviceId);
        }

        public void SetLevel(string zoneId, int level)
        {
            level = Math.Max(0, Math.Min(100, level));
            var command = "#OUTPUT," + zoneId + ",1," + level + "\r\n";
            _transport?.Send(command);
            _zoneLevels[zoneId] = level;
            RaiseFeedback("level:" + zoneId, level);
        }

        public void RecallScene(string sceneId)
        {
            var command = "#DEVICE," + sceneId + ",3\r\n";
            _transport?.Send(command);
            RaiseFeedback("scene", sceneId);
        }

        public int GetLevel(string zoneId)
        {
            _zoneLevels.TryGetValue(zoneId, out var level);
            return level;
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.Data == null) return;

            try
            {
                // Parse Lutron feedback: ~OUTPUT,id,1,level
                var lines = e.Data.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var line in lines)
                {
                    if (line.StartsWith("~OUTPUT,", StringComparison.OrdinalIgnoreCase))
                    {
                        ParseOutputFeedback(line);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.Error("Lutron parse error: " + ex.Message);
            }
        }

        private void ParseOutputFeedback(string line)
        {
            var parts = line.Substring(8).Split(',');
            if (parts.Length >= 3)
            {
                var zoneId = parts[0];
                if (int.TryParse(parts[2], out var level))
                {
                    _zoneLevels[zoneId] = level;
                    RaiseFeedback("level:" + zoneId, level);
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
