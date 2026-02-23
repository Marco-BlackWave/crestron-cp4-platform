using System;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;
using CrestronCP4.ProcessorSide.Transport.Protocols;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Modbus HVAC driver that reads/writes temperature, setpoint, and mode
    /// via Modbus TCP or RTU. Uses standard holding registers.
    /// </summary>
    public sealed class ModbusHvac : IHvacDriver
    {
        private readonly ILogger _logger;
        private ModbusTcpClient _modbus;
        private ITransport _transport;
        private bool _disposed;

        // Default Modbus register addresses — configurable per device
        private readonly ushort _tempRegister;
        private readonly ushort _setpointRegister;
        private readonly ushort _modeRegister;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;
        public int CurrentTemp { get; private set; }
        public int Setpoint { get; private set; }
        public string Mode { get; private set; } = "off";

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public ModbusHvac(string deviceId, ushort tempRegister, ushort setpointRegister, ushort modeRegister, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _tempRegister = tempRegister;
            _setpointRegister = setpointRegister;
            _modeRegister = modeRegister;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public ModbusHvac(string deviceId, ILogger logger)
            : this(deviceId, 0, 1, 2, logger)
        {
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _modbus = new ModbusTcpClient(transport, 1, _logger);
            _modbus.ResponseReceived += OnModbusResponse;
            _modbus.Connect();
            _logger.Info("Modbus HVAC initialized: " + DeviceId);

            PollValues();
        }

        public void SetSetpoint(int temp)
        {
            Setpoint = temp;
            _modbus?.WriteSingleRegister(_setpointRegister, (ushort)temp);
            RaiseFeedback("setpoint", temp);
        }

        public void SetMode(string mode)
        {
            Mode = mode ?? "off";
            ushort modeValue = ModeToValue(Mode);
            _modbus?.WriteSingleRegister(_modeRegister, modeValue);
            RaiseFeedback("mode", Mode);
        }

        public void PollValues()
        {
            // Read all 3 registers in one request
            _modbus?.ReadHoldingRegisters(_tempRegister, 3);
        }

        private void OnModbusResponse(object sender, ModbusResponseEventArgs e)
        {
            try
            {
                if (e.FunctionCode == 0x03)
                {
                    var values = e.GetRegisterValues();
                    if (values.Length >= 3)
                    {
                        CurrentTemp = values[0];
                        Setpoint = values[1];
                        Mode = ValueToMode(values[2]);

                        RaiseFeedback("currentTemp", CurrentTemp);
                        RaiseFeedback("setpoint", Setpoint);
                        RaiseFeedback("mode", Mode);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.Error("Modbus HVAC response error: " + ex.Message);
            }
        }

        private static ushort ModeToValue(string mode)
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

        private static string ValueToMode(ushort value)
        {
            switch (value)
            {
                case 1: return "heat";
                case 2: return "cool";
                case 3: return "auto";
                default: return "off";
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
            if (_modbus != null)
            {
                _modbus.ResponseReceived -= OnModbusResponse;
                _modbus.Dispose();
            }
        }
    }
}
