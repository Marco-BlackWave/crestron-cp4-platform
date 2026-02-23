using System;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Dedicated Elk M1 security panel driver.
    /// Implements the Elk RS-232 ASCII protocol with two-character command codes,
    /// zone status tracking, and checksum validation.
    /// </summary>
    public sealed class ElkM1Driver : ISecurityDriver
    {
        private readonly ILogger _logger;
        private ITransport _transport;
        private readonly bool[] _zoneOpen;
        private bool _disposed;

        // Elk M1 protocol constants
        private const int MAX_ZONES = 208;
        private const string CMD_ARM_AWAY = "a1";
        private const string CMD_ARM_STAY = "a2";
        private const string CMD_ARM_NIGHT = "a3";
        private const string CMD_DISARM = "a0";
        private const string CMD_ZONE_STATUS = "zs";
        private const string CMD_ARMING_STATUS = "as";

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;
        public string ArmMode { get; private set; } = "Disarmed";
        public bool IsAlarmActive { get; private set; }
        public bool IsReady { get; private set; } = true;
        public bool IsTrouble { get; private set; }
        public int ZoneCount => MAX_ZONES;

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public ElkM1Driver(string deviceId, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _zoneOpen = new bool[MAX_ZONES + 1]; // 1-based indexing
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("Elk M1 initialized: " + DeviceId);
            StatusRequest();
        }

        public void ArmAway()
        {
            SendElkCommand(CMD_ARM_AWAY, "1"); // Area 1
            _logger.Info(DeviceId + ": Arm Away sent");
        }

        public void ArmStay()
        {
            SendElkCommand(CMD_ARM_STAY, "1");
            _logger.Info(DeviceId + ": Arm Stay sent");
        }

        public void ArmNight()
        {
            SendElkCommand(CMD_ARM_NIGHT, "1");
            _logger.Info(DeviceId + ": Arm Night sent");
        }

        public void Disarm(string code)
        {
            if (string.IsNullOrEmpty(code)) return;
            // Elk disarm: a0 + area + code (padded to 6 digits)
            var paddedCode = (code + "000000").Substring(0, 6);
            SendElkCommand(CMD_DISARM, "1" + paddedCode);
            _logger.Info(DeviceId + ": Disarm sent");
        }

        public void StatusRequest()
        {
            SendElkCommand(CMD_ZONE_STATUS, "");
            SendElkCommand(CMD_ARMING_STATUS, "");
        }

        public void Panic()
        {
            // Elk panic: send alarm trigger
            SendElkCommand("ar", "1"); // Alarm report, area 1
            _logger.Info(DeviceId + ": Panic triggered");
        }

        public bool IsZoneOpen(int zone)
        {
            if (zone < 1 || zone > MAX_ZONES) return false;
            return _zoneOpen[zone];
        }

        private void SendElkCommand(string command, string data)
        {
            // Elk format: [length][command][data][checksum][CR][LF]
            var body = command + data;
            var length = body.Length + 2; // +2 for checksum
            var msg = length.ToString("X2") + body;

            // Calculate checksum (twos-complement of sum of all chars)
            var sum = 0;
            for (int i = 0; i < msg.Length; i++)
                sum += msg[i];
            var checksum = ((~sum) + 1) & 0xFF;

            _transport?.Send(msg + checksum.ToString("X2") + "\r\n");
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (string.IsNullOrEmpty(e.Data)) return;

            try
            {
                ParseElkResponse(e.Data);
            }
            catch (Exception ex)
            {
                _logger.Error(DeviceId + " Elk parse error: " + ex.Message);
            }
        }

        private void ParseElkResponse(string data)
        {
            // Elk responses are terminated with CR/LF
            // Format: [length][response_code][data][checksum]
            if (data.Length < 4) return;

            var responseCode = data.Substring(2, 2).ToUpperInvariant();

            switch (responseCode)
            {
                case "ZC": // Zone change
                    ParseZoneChange(data);
                    break;
                case "ZS": // Zone status reply
                    ParseZoneStatusReply(data);
                    break;
                case "AS": // Arming status reply
                    ParseArmingStatus(data);
                    break;
                case "AL": // Alarm memory
                    IsAlarmActive = true;
                    RaiseFeedback("alarm", true);
                    break;
                case "AM": // Alarm memory cleared
                    IsAlarmActive = false;
                    RaiseFeedback("alarm", false);
                    break;
                case "IC": // Invalid code entered
                    _logger.Warn(DeviceId + ": invalid user code entered");
                    break;
            }
        }

        private void ParseZoneChange(string data)
        {
            // ZC: [len]ZC[zone3][status1][checksum]
            if (data.Length < 7) return;
            var zoneStr = data.Substring(4, 3);
            var statusChar = data[7];

            if (int.TryParse(zoneStr, out var zone) && zone >= 1 && zone <= MAX_ZONES)
            {
                // Status: '0'=normal, '1'=open, '2'=short, '3'=violated
                var isOpen = statusChar != '0';
                _zoneOpen[zone] = isOpen;
                RaiseFeedback("zone_" + zone, isOpen);
            }
        }

        private void ParseZoneStatusReply(string data)
        {
            // ZS reply contains status for all zones
            if (data.Length < 4 + MAX_ZONES) return;
            var offset = 4; // Past [len]ZS

            for (int z = 1; z <= MAX_ZONES && offset < data.Length - 2; z++, offset++)
            {
                var isOpen = data[offset] != '0';
                _zoneOpen[z] = isOpen;
            }

            // Check if system is "ready" (all zones normal)
            IsReady = true;
            for (int z = 1; z <= MAX_ZONES; z++)
            {
                if (_zoneOpen[z]) { IsReady = false; break; }
            }
            RaiseFeedback("ready", IsReady);
        }

        private void ParseArmingStatus(string data)
        {
            // AS: [len]AS[area_status_8][up_state_8][alarm_state_8][checksum]
            if (data.Length < 12) return;
            var areaStatus = data[4]; // First area

            switch (areaStatus)
            {
                case '0': ArmMode = "Disarmed"; break;
                case '1': ArmMode = "ArmedAway"; break;
                case '2': ArmMode = "ArmedStay"; break;
                case '3': ArmMode = "ArmedStayInstant"; break;
                case '4': ArmMode = "ArmedNight"; break;
                case '5': ArmMode = "ArmedNightInstant"; break;
                case '6': ArmMode = "ArmedVacation"; break;
                default: ArmMode = "Unknown"; break;
            }

            RaiseFeedback("armMode", ArmMode);
            _logger.Info(DeviceId + ": arm mode = " + ArmMode);
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
