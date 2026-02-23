using System;
using System.Security.Cryptography;
using System.Text;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport.Protocols
{
    /// <summary>
    /// PJLink projector control protocol client (TCP port 4352).
    /// Class 1 implementation supporting power, input, mute, lamp, and error status.
    /// Standard protocol supported by Epson, Optoma, NEC, Panasonic, and many others.
    /// </summary>
    public sealed class PjLinkClient : IDisposable
    {
        private readonly ITransport _transport;
        private readonly string _password;
        private readonly ILogger _logger;
        private string _authChallenge;
        private bool _authenticated;
        private bool _disposed;

        // PJLink command codes
        private const string CMD_POWER = "%1POWR";
        private const string CMD_INPUT = "%1INPT";
        private const string CMD_MUTE = "%1AVMT";
        private const string CMD_LAMP = "%1LAMP";
        private const string CMD_ERROR_STATUS = "%1ERST";
        private const string CMD_CLASS = "%1CLSS";
        private const string CMD_NAME = "%1NAME";
        private const string CMD_INFO1 = "%1INF1"; // Manufacturer
        private const string CMD_INFO2 = "%1INF2"; // Model
        private const string TERMINATOR = "\r";

        public event EventHandler<PjLinkResponseEventArgs> ResponseReceived;

        public PjLinkClient(ITransport transport, ILogger logger, string password = null)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _password = password;
            _transport.DataReceived += OnDataReceived;
        }

        public void Connect()
        {
            _transport.Connect();
            _logger.Info("PJLink client connecting (port 4352)");
        }

        /// <summary>
        /// Power on the projector.
        /// </summary>
        public void PowerOn()
        {
            SendCommand(CMD_POWER + " 1" + TERMINATOR);
        }

        /// <summary>
        /// Power off (standby) the projector.
        /// </summary>
        public void PowerOff()
        {
            SendCommand(CMD_POWER + " 0" + TERMINATOR);
        }

        /// <summary>
        /// Query power status. Response: 0=standby, 1=on, 2=cooling, 3=warming.
        /// </summary>
        public void QueryPower()
        {
            SendCommand(CMD_POWER + " ?" + TERMINATOR);
        }

        /// <summary>
        /// Select input. inputType: 1=RGB, 2=Video, 3=Digital, 4=Storage, 5=Network.
        /// inputNumber: 1-9 for the specific connector.
        /// </summary>
        public void SelectInput(int inputType, int inputNumber)
        {
            SendCommand(CMD_INPUT + " " + inputType + inputNumber + TERMINATOR);
        }

        /// <summary>
        /// Query current input.
        /// </summary>
        public void QueryInput()
        {
            SendCommand(CMD_INPUT + " ?" + TERMINATOR);
        }

        /// <summary>
        /// Set AV mute. muteType: 10=video off, 20=audio off, 30=both off.
        /// Add 1 for on: 11=video on, 21=audio on, 31=both on.
        /// </summary>
        public void SetMute(int muteValue)
        {
            SendCommand(CMD_MUTE + " " + muteValue + TERMINATOR);
        }

        /// <summary>
        /// Query lamp hours and status.
        /// </summary>
        public void QueryLamp()
        {
            SendCommand(CMD_LAMP + " ?" + TERMINATOR);
        }

        /// <summary>
        /// Query error status (fan, lamp, temperature, cover, filter, other).
        /// </summary>
        public void QueryErrors()
        {
            SendCommand(CMD_ERROR_STATUS + " ?" + TERMINATOR);
        }

        /// <summary>
        /// Query projector name.
        /// </summary>
        public void QueryName()
        {
            SendCommand(CMD_NAME + " ?" + TERMINATOR);
        }

        /// <summary>
        /// Query manufacturer info.
        /// </summary>
        public void QueryManufacturer()
        {
            SendCommand(CMD_INFO1 + " ?" + TERMINATOR);
        }

        /// <summary>
        /// Query model info.
        /// </summary>
        public void QueryModel()
        {
            SendCommand(CMD_INFO2 + " ?" + TERMINATOR);
        }

        private void SendCommand(string command)
        {
            if (_authChallenge != null && !string.IsNullOrEmpty(_password) && !_authenticated)
            {
                // MD5 authentication: hash = MD5(challenge + password)
                var hashInput = _authChallenge + _password;
                using (var md5 = MD5.Create())
                {
                    var hash = md5.ComputeHash(Encoding.ASCII.GetBytes(hashInput));
                    var hashStr = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
                    _transport.Send(hashStr + command);
                }
                _authenticated = true;
            }
            else
            {
                _transport.Send(command);
            }
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (string.IsNullOrEmpty(e.Data)) return;

            try
            {
                var data = e.Data.TrimEnd('\r', '\n');

                // Authentication challenge: "PJLINK 1 <challenge>"
                if (data.StartsWith("PJLINK"))
                {
                    var parts = data.Split(' ');
                    if (parts.Length >= 2)
                    {
                        if (parts[1] == "0")
                        {
                            // No authentication required
                            _authenticated = true;
                            _logger.Info("PJLink: no auth required");
                        }
                        else if (parts[1] == "1" && parts.Length >= 3)
                        {
                            _authChallenge = parts[2];
                            _logger.Info("PJLink: auth challenge received");
                        }
                        else if (parts[1] == "ERRA")
                        {
                            _logger.Error("PJLink: authentication error");
                        }
                    }
                    return;
                }

                // Response format: %1XXXX=value
                if (data.Length >= 7 && data[0] == '%')
                {
                    var eqIdx = data.IndexOf('=');
                    if (eqIdx > 0)
                    {
                        var command = data.Substring(0, eqIdx);
                        var value = data.Substring(eqIdx + 1);

                        ResponseReceived?.Invoke(this, new PjLinkResponseEventArgs(command, value));

                        // Log specific responses
                        switch (command)
                        {
                            case "%1POWR":
                                _logger.Info("PJLink power: " + (value == "1" ? "ON" : value == "0" ? "STANDBY" : value));
                                break;
                            case "%1LAMP":
                                _logger.Info("PJLink lamp: " + value);
                                break;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.Error("PJLink parse error: " + ex.Message);
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _transport.DataReceived -= OnDataReceived;
            _transport.Disconnect();
        }
    }

    public sealed class PjLinkResponseEventArgs : EventArgs
    {
        public string Command { get; }
        public string Value { get; }

        public PjLinkResponseEventArgs(string command, string value)
        {
            Command = command;
            Value = value;
        }

        /// <summary>
        /// For LAMP response: returns lamp hours (first lamp).
        /// Format: "12345 1" (hours + on/off status)
        /// </summary>
        public int GetLampHours()
        {
            if (string.IsNullOrEmpty(Value)) return 0;
            var parts = Value.Split(' ');
            if (parts.Length >= 1 && int.TryParse(parts[0], out var hours))
                return hours;
            return 0;
        }

        /// <summary>
        /// For POWR response: 0=standby, 1=on, 2=cooling, 3=warming.
        /// </summary>
        public int GetPowerState()
        {
            if (int.TryParse(Value, out var state)) return state;
            return -1;
        }
    }
}
