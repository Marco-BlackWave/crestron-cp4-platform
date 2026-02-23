using System;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport.Protocols
{
    /// <summary>
    /// Modbus TCP protocol client built on top of ITransport (TCP).
    /// Implements FC03 (Read Holding Registers), FC06 (Write Single Register), FC16 (Write Multiple Registers).
    /// Default port: 502.
    /// </summary>
    public sealed class ModbusTcpClient : IDisposable
    {
        private readonly ITransport _transport;
        private readonly byte _unitId;
        private readonly ILogger _logger;
        private ushort _transactionId;
        private bool _disposed;

        public event EventHandler<ModbusResponseEventArgs> ResponseReceived;

        public ModbusTcpClient(ITransport transport, byte unitId, ILogger logger)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _unitId = unitId;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _transport.DataReceived += OnDataReceived;
        }

        public void Connect()
        {
            _transport.Connect();
        }

        /// <summary>
        /// FC03: Read Holding Registers.
        /// </summary>
        public void ReadHoldingRegisters(ushort startAddress, ushort quantity)
        {
            var frame = BuildRequest(0x03, startAddress, quantity);
            _transport.Send(frame);
            _logger.Info("Modbus FC03: read " + quantity + " registers at " + startAddress);
        }

        /// <summary>
        /// FC06: Write Single Register.
        /// </summary>
        public void WriteSingleRegister(ushort address, ushort value)
        {
            var frame = BuildRequest(0x06, address, value);
            _transport.Send(frame);
            _logger.Info("Modbus FC06: write " + value + " to register " + address);
        }

        /// <summary>
        /// FC16: Write Multiple Registers.
        /// </summary>
        public void WriteMultipleRegisters(ushort startAddress, ushort[] values)
        {
            var pduLength = 7 + (values.Length * 2);
            var frame = new byte[6 + pduLength];
            var txId = _transactionId++;

            // MBAP Header
            frame[0] = (byte)(txId >> 8);
            frame[1] = (byte)(txId & 0xFF);
            frame[2] = 0; // Protocol ID
            frame[3] = 0;
            frame[4] = (byte)((pduLength) >> 8);
            frame[5] = (byte)((pduLength) & 0xFF);

            // PDU
            frame[6] = _unitId;
            frame[7] = 0x10; // FC16
            frame[8] = (byte)(startAddress >> 8);
            frame[9] = (byte)(startAddress & 0xFF);
            frame[10] = (byte)(values.Length >> 8);
            frame[11] = (byte)(values.Length & 0xFF);
            frame[12] = (byte)(values.Length * 2);

            for (int i = 0; i < values.Length; i++)
            {
                frame[13 + (i * 2)] = (byte)(values[i] >> 8);
                frame[14 + (i * 2)] = (byte)(values[i] & 0xFF);
            }

            _transport.Send(frame);
            _logger.Info("Modbus FC16: write " + values.Length + " registers at " + startAddress);
        }

        private byte[] BuildRequest(byte functionCode, ushort param1, ushort param2)
        {
            var frame = new byte[12];
            var txId = _transactionId++;

            // MBAP Header (7 bytes)
            frame[0] = (byte)(txId >> 8);
            frame[1] = (byte)(txId & 0xFF);
            frame[2] = 0; // Protocol ID
            frame[3] = 0;
            frame[4] = 0; // Length
            frame[5] = 6;

            // PDU
            frame[6] = _unitId;
            frame[7] = functionCode;
            frame[8] = (byte)(param1 >> 8);
            frame[9] = (byte)(param1 & 0xFF);
            frame[10] = (byte)(param2 >> 8);
            frame[11] = (byte)(param2 & 0xFF);

            return frame;
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.RawData == null || e.RawData.Length < 9) return;

            try
            {
                var functionCode = e.RawData[7];
                var isError = (functionCode & 0x80) != 0;

                if (isError)
                {
                    var errorCode = e.RawData[8];
                    _logger.Error("Modbus error FC" + (functionCode & 0x7F) + ": code " + errorCode);
                    return;
                }

                ResponseReceived?.Invoke(this, new ModbusResponseEventArgs(functionCode, e.RawData));
            }
            catch (Exception ex)
            {
                _logger.Error("Modbus parse error: " + ex.Message);
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

    public sealed class ModbusResponseEventArgs : EventArgs
    {
        public byte FunctionCode { get; }
        public byte[] RawData { get; }

        public ModbusResponseEventArgs(byte functionCode, byte[] rawData)
        {
            FunctionCode = functionCode;
            RawData = rawData;
        }

        /// <summary>
        /// Extracts register values from FC03 response.
        /// </summary>
        public ushort[] GetRegisterValues()
        {
            if (FunctionCode != 0x03 || RawData.Length < 10) return new ushort[0];
            var byteCount = RawData[8];
            var registers = new ushort[byteCount / 2];
            for (int i = 0; i < registers.Length; i++)
            {
                registers[i] = (ushort)((RawData[9 + (i * 2)] << 8) | RawData[10 + (i * 2)]);
            }
            return registers;
        }
    }
}
