using System;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Dedicated Shelly smart-home driver using HTTP REST API over TCP.
    /// Handles relay, dimmer, roller, and status endpoints.
    /// </summary>
    public sealed class ShellyDriver : IGatewayDriver
    {
        private readonly string _shellyAddress;
        private readonly ILogger _logger;
        private ITransport _transport;
        private bool _disposed;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public ShellyDriver(string deviceId, string address, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _shellyAddress = address ?? "127.0.0.1";
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("Shelly initialized: " + DeviceId + " at " + _shellyAddress);
        }

        public void SendCommand(string objectId, string command, string value)
        {
            // objectId = channel index (e.g., "0", "1")
            // command = "relay", "dimmer", "roller"
            // value = "on", "off", "0-100", "open", "close", "stop"

            string path;
            switch (command.ToLowerInvariant())
            {
                case "relay":
                    path = "/relay/" + objectId + "?turn=" + value;
                    break;
                case "dimmer":
                    path = "/light/" + objectId + "?brightness=" + value;
                    break;
                case "roller":
                    path = "/roller/" + objectId + "?go=" + value;
                    break;
                case "color":
                    path = "/light/" + objectId + "?" + value; // value = "red=255&green=0&blue=128"
                    break;
                default:
                    path = "/" + command + "/" + objectId + "?" + value;
                    break;
            }

            var httpRequest = "GET " + path + " HTTP/1.1\r\n" +
                              "Host: " + _shellyAddress + "\r\n" +
                              "Connection: keep-alive\r\n\r\n";
            _transport?.Send(httpRequest);
            _logger.Info(DeviceId + ": " + command + " ch" + objectId + " = " + value);
        }

        public void Subscribe(string objectId)
        {
            // Shelly doesn't support subscriptions; use polling
            Poll(objectId);
        }

        public void Poll(string objectId)
        {
            var path = "/status";
            var httpRequest = "GET " + path + " HTTP/1.1\r\n" +
                              "Host: " + _shellyAddress + "\r\n" +
                              "Connection: keep-alive\r\n\r\n";
            _transport?.Send(httpRequest);
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.Data == null) return;

            try
            {
                // Parse HTTP response body (JSON)
                var bodyStart = e.Data.IndexOf("\r\n\r\n");
                if (bodyStart < 0) return;
                var body = e.Data.Substring(bodyStart + 4);

                // Simple key extraction for relay/dimmer status
                ParseJsonField(body, "ison", "relayState");
                ParseJsonField(body, "brightness", "brightness");
                ParseJsonField(body, "current_pos", "rollerPosition");
                ParseJsonField(body, "temperature", "temperature");
                ParseJsonField(body, "power", "power");
            }
            catch (Exception ex)
            {
                _logger.Error(DeviceId + " Shelly parse error: " + ex.Message);
            }
        }

        private void ParseJsonField(string json, string fieldName, string signalName)
        {
            var key = "\"" + fieldName + "\":";
            var idx = json.IndexOf(key);
            if (idx < 0) return;

            idx += key.Length;
            // Skip whitespace
            while (idx < json.Length && json[idx] == ' ') idx++;

            if (idx >= json.Length) return;

            if (json[idx] == 't')
            {
                RaiseFeedback(signalName, true);
            }
            else if (json[idx] == 'f')
            {
                RaiseFeedback(signalName, false);
            }
            else
            {
                // Number value
                var end = idx;
                while (end < json.Length && (char.IsDigit(json[end]) || json[end] == '.')) end++;
                var numStr = json.Substring(idx, end - idx);
                if (int.TryParse(numStr, out var intVal))
                    RaiseFeedback(signalName, intVal);
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
