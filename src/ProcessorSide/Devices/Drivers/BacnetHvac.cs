using System;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;
using CrestronCP4.ProcessorSide.Transport.Protocols;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// BACnet HVAC driver that reads/writes temperature, setpoint, and mode
    /// via BACnet/IP protocol. Uses Analog Values for temperature and
    /// Multi-State Values for mode.
    /// </summary>
    public sealed class BacnetHvac : IHvacDriver
    {
        private readonly uint _objectId;
        private readonly ILogger _logger;
        private BacnetClient _bacnet;
        private ITransport _transport;
        private bool _disposed;

        // BACnet object instances (configurable per installation)
        private readonly uint _tempObjectInstance;
        private readonly uint _setpointObjectInstance;
        private readonly uint _modeObjectInstance;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;
        public int CurrentTemp { get; private set; }
        public int Setpoint { get; private set; }
        public string Mode { get; private set; } = "off";

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public BacnetHvac(string deviceId, uint objectId, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _objectId = objectId;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            // Default BACnet object instances — typically configured per installation
            _tempObjectInstance = objectId * 10;
            _setpointObjectInstance = objectId * 10 + 1;
            _modeObjectInstance = objectId * 10 + 2;
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _bacnet = new BacnetClient(transport, _logger);
            _bacnet.ResponseReceived += OnBacnetResponse;
            _bacnet.Connect();
            _logger.Info("BACnet HVAC initialized: " + DeviceId + " (object " + _objectId + ")");

            // Initial poll
            PollValues();
        }

        public void SetSetpoint(int temp)
        {
            Setpoint = temp;
            _bacnet?.WriteAnalogValue(_setpointObjectInstance, temp / 10f);
            RaiseFeedback("setpoint", temp);
        }

        public void SetMode(string mode)
        {
            Mode = mode ?? "off";
            uint modeValue = ModeToValue(Mode);
            _bacnet?.WriteProperty(19, _modeObjectInstance, 85, modeValue);
            RaiseFeedback("mode", Mode);
        }

        public void PollValues()
        {
            _bacnet?.ReadAnalogValue(_tempObjectInstance);
            _bacnet?.ReadAnalogValue(_setpointObjectInstance);
            _bacnet?.ReadMultiStateValue(_modeObjectInstance);
        }

        private void OnBacnetResponse(object sender, BacnetResponseEventArgs e)
        {
            // Parse BACnet response and update state
            // In production, decode ASN.1/BER response fully
            try
            {
                // Simplified — real implementation would decode the full APDU
                _logger.Info("BACnet response received for " + DeviceId + " (" + e.RawData.Length + " bytes)");
            }
            catch (Exception ex)
            {
                _logger.Error("BACnet HVAC response error: " + ex.Message);
            }
        }

        private static uint ModeToValue(string mode)
        {
            switch ((mode ?? "").ToLowerInvariant())
            {
                case "heat": return 1;
                case "cool": return 2;
                case "auto": return 3;
                case "off":
                default: return 0;
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
            if (_bacnet != null)
            {
                _bacnet.ResponseReceived -= OnBacnetResponse;
                _bacnet.Dispose();
            }
        }
    }
}
