using System;
using System.Text;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport.Protocols
{
    /// <summary>
    /// Shelly REST API client over HTTP/TCP.
    /// Handles relay, dimmer, roller, and status endpoints.
    /// Covers ~20 Shelly modules from the SIMPL+ library.
    /// </summary>
    public sealed class ShellyHttpClient : IDisposable
    {
        private readonly ITransport _transport;
        private readonly string _host;
        private readonly ILogger _logger;
        private readonly StringBuilder _receiveBuffer = new StringBuilder();
        private bool _disposed;

        public event EventHandler<ShellyStatusEventArgs> StatusReceived;

        public ShellyHttpClient(ITransport transport, string host, ILogger logger)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _host = host ?? "127.0.0.1";
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _transport.DataReceived += OnDataReceived;
        }

        public void Connect()
        {
            _transport.Connect();
            _logger.Info("Shelly HTTP client connected to " + _host);
        }

        /// <summary>
        /// Get device status (all channels).
        /// </summary>
        public void GetStatus()
        {
            SendHttpGet("/status");
        }

        /// <summary>
        /// Set relay state for a channel.
        /// </summary>
        public void SetRelay(int channel, bool on)
        {
            SendHttpGet("/relay/" + channel + "?turn=" + (on ? "on" : "off"));
            _logger.Info("Shelly relay " + channel + " = " + (on ? "on" : "off"));
        }

        /// <summary>
        /// Set dimmer brightness for a channel (0-100).
        /// </summary>
        public void SetDimmer(int channel, int level)
        {
            var state = level > 0 ? "on" : "off";
            SendHttpGet("/light/" + channel + "?turn=" + state + "&brightness=" + level);
        }

        /// <summary>
        /// Control roller shutter.
        /// action: "open", "close", "stop"
        /// </summary>
        public void SetRoller(int channel, string action)
        {
            SendHttpGet("/roller/" + channel + "?go=" + action);
        }

        /// <summary>
        /// Set roller position (0=closed, 100=open).
        /// </summary>
        public void SetRollerPosition(int channel, int position)
        {
            SendHttpGet("/roller/" + channel + "?go=to_pos&roller_pos=" + position);
        }

        /// <summary>
        /// Set RGB color (Shelly RGBW2, Bulb Duo).
        /// </summary>
        public void SetColor(int channel, byte red, byte green, byte blue, byte white)
        {
            SendHttpGet("/light/" + channel + "?turn=on&red=" + red +
                        "&green=" + green + "&blue=" + blue + "&white=" + white);
        }

        /// <summary>
        /// Get settings for a specific endpoint.
        /// </summary>
        public void GetSettings()
        {
            SendHttpGet("/settings");
        }

        private void SendHttpGet(string path)
        {
            var request = "GET " + path + " HTTP/1.1\r\n" +
                          "Host: " + _host + "\r\n" +
                          "Connection: keep-alive\r\n\r\n";
            _transport.Send(request);
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.Data == null) return;

            try
            {
                _receiveBuffer.Append(e.Data);
                var full = _receiveBuffer.ToString();

                // Check if we have a complete HTTP response
                var headerEnd = full.IndexOf("\r\n\r\n");
                if (headerEnd < 0) return;

                var body = full.Substring(headerEnd + 4);

                // Simple content-length check
                var clIdx = full.IndexOf("Content-Length: ");
                if (clIdx >= 0)
                {
                    var clEnd = full.IndexOf("\r\n", clIdx);
                    var clStr = full.Substring(clIdx + 16, clEnd - clIdx - 16);
                    if (int.TryParse(clStr, out var contentLength) && body.Length < contentLength)
                        return; // Still receiving body
                }

                _receiveBuffer.Clear();
                ParseStatusResponse(body);
            }
            catch (Exception ex)
            {
                _logger.Error("Shelly HTTP parse error: " + ex.Message);
                _receiveBuffer.Clear();
            }
        }

        private void ParseStatusResponse(string json)
        {
            // Simple JSON field extraction (no external JSON lib on Crestron)
            var status = new ShellyStatusEventArgs();

            status.IsOn = ExtractBoolField(json, "ison");
            status.Brightness = ExtractIntField(json, "brightness");
            status.Power = ExtractDoubleField(json, "power");
            status.Temperature = ExtractDoubleField(json, "temperature");
            status.CurrentPosition = ExtractIntField(json, "current_pos");

            StatusReceived?.Invoke(this, status);
        }

        private static bool ExtractBoolField(string json, string field)
        {
            var key = "\"" + field + "\":";
            var idx = json.IndexOf(key);
            if (idx < 0) return false;
            idx += key.Length;
            while (idx < json.Length && json[idx] == ' ') idx++;
            return idx < json.Length && json[idx] == 't';
        }

        private static int ExtractIntField(string json, string field)
        {
            var key = "\"" + field + "\":";
            var idx = json.IndexOf(key);
            if (idx < 0) return -1;
            idx += key.Length;
            while (idx < json.Length && json[idx] == ' ') idx++;
            var end = idx;
            while (end < json.Length && (char.IsDigit(json[end]) || json[end] == '-')) end++;
            if (end > idx && int.TryParse(json.Substring(idx, end - idx), out var val))
                return val;
            return -1;
        }

        private static double ExtractDoubleField(string json, string field)
        {
            var key = "\"" + field + "\":";
            var idx = json.IndexOf(key);
            if (idx < 0) return 0;
            idx += key.Length;
            while (idx < json.Length && json[idx] == ' ') idx++;
            var end = idx;
            while (end < json.Length && (char.IsDigit(json[end]) || json[end] == '.' || json[end] == '-')) end++;
            if (end > idx && double.TryParse(json.Substring(idx, end - idx), out var val))
                return val;
            return 0;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _transport.DataReceived -= OnDataReceived;
            _transport.Disconnect();
        }
    }

    public sealed class ShellyStatusEventArgs : EventArgs
    {
        public bool IsOn { get; set; }
        public int Brightness { get; set; }
        public double Power { get; set; }
        public double Temperature { get; set; }
        public int CurrentPosition { get; set; } = -1;
    }
}
