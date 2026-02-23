using System;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// DSC IT-100 serial interface driver.
    /// Sends 3-digit command codes and parses 3-digit response codes from serial feedback.
    /// Protocol: 9600 baud, 8N1.
    /// </summary>
    public sealed class DscIt100Driver : ISecurityDriver
    {
        private readonly ILogger _logger;
        private ITransport _transport;
        private readonly bool[] _zoneOpen = new bool[8];
        private bool _disposed;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;
        public string ArmMode { get; private set; } = "Disarmed";
        public bool IsAlarmActive { get; private set; }
        public bool IsReady { get; private set; }
        public bool IsTrouble { get; private set; }
        public int ZoneCount => 8;

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public DscIt100Driver(string deviceId, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("DSC IT-100 initialized: " + DeviceId);
            StatusRequest();
        }

        public void ArmAway()
        {
            SendCommand("0301\r\n");
            _logger.Info(DeviceId + ": Arm Away sent");
        }

        public void ArmStay()
        {
            SendCommand("0311\r\n");
            _logger.Info(DeviceId + ": Arm Stay sent");
        }

        public void ArmNight()
        {
            // DSC IT-100 uses arm stay with no-entry for night mode
            SendCommand("0321\r\n");
            _logger.Info(DeviceId + ": Arm Night sent");
        }

        public void Disarm(string code)
        {
            if (string.IsNullOrEmpty(code))
            {
                _logger.Warn(DeviceId + ": Disarm requires a code");
                return;
            }
            SendCommand("0401" + code + "\r\n");
            _logger.Info(DeviceId + ": Disarm sent");
        }

        public void StatusRequest()
        {
            SendCommand("001\r\n");
        }

        public void Panic()
        {
            SendCommand("0601\r\n");
            _logger.Info(DeviceId + ": Panic sent");
        }

        public bool IsZoneOpen(int zone)
        {
            if (zone < 1 || zone > ZoneCount) return false;
            return _zoneOpen[zone - 1];
        }

        private void SendCommand(string command)
        {
            _transport?.Send(command);
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (string.IsNullOrEmpty(e.Data)) return;

            try
            {
                ParseResponse(e.Data);
            }
            catch (Exception ex)
            {
                _logger.Error(DeviceId + " parse error: " + ex.Message);
            }
        }

        private void ParseResponse(string data)
        {
            // DSC IT-100 responses are 3-digit codes followed by data
            if (data.Length < 3) return;
            var code = data.Substring(0, 3);

            switch (code)
            {
                case "650": // Partition Ready
                    IsReady = true;
                    RaiseFeedback("ready", true);
                    break;

                case "651": // Partition Not Ready
                    IsReady = false;
                    RaiseFeedback("ready", false);
                    break;

                case "652": // Partition Armed
                    HandleArmedResponse(data);
                    break;

                case "654": // Partition In Alarm
                    IsAlarmActive = true;
                    RaiseFeedback("alarm", true);
                    break;

                case "655": // Partition Disarmed
                    ArmMode = "Disarmed";
                    IsAlarmActive = false;
                    RaiseFeedback("armMode", "Disarmed");
                    RaiseFeedback("alarm", false);
                    break;

                case "609": // Zone Open
                    HandleZoneChange(data, true);
                    break;

                case "610": // Zone Restored
                    HandleZoneChange(data, false);
                    break;

                case "840": // Trouble LED On
                    IsTrouble = true;
                    RaiseFeedback("trouble", true);
                    break;

                case "841": // Trouble LED Off
                    IsTrouble = false;
                    RaiseFeedback("trouble", false);
                    break;
            }
        }

        private void HandleArmedResponse(string data)
        {
            // 652 data byte indicates mode: 0=away, 1=stay, 2=zero-entry-away, 3=zero-entry-stay
            string mode = "Armed Away";
            if (data.Length > 4)
            {
                var modeChar = data[4];
                switch (modeChar)
                {
                    case '0': mode = "Armed Away"; break;
                    case '1': mode = "Armed Stay"; break;
                    case '2': mode = "Armed Away"; break;
                    case '3': mode = "Armed Night"; break;
                }
            }
            ArmMode = mode;
            IsAlarmActive = false;
            RaiseFeedback("armMode", mode);
        }

        private void HandleZoneChange(string data, bool open)
        {
            // Zone number follows the 3-digit code + partition (1 digit)
            if (data.Length >= 5 && int.TryParse(data.Substring(4).Trim(), out int zone))
            {
                if (zone >= 1 && zone <= ZoneCount)
                {
                    _zoneOpen[zone - 1] = open;
                    RaiseFeedback("zone" + zone, open);
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
            }
        }
    }
}
