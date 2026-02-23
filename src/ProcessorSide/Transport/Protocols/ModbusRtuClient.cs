using System;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport.Protocols
{
    /// <summary>
    /// Modbus RTU protocol client built on top of ITransport (Serial).
    /// Uses CRC-16 error checking. Typical serial config: 9600/19200 baud, 8N1 or 8E1.
    /// </summary>
    public sealed class ModbusRtuClient : IDisposable
    {
        private readonly ITransport _transport;
        private readonly byte _slaveAddress;
        private readonly ILogger _logger;
        private bool _disposed;

        public event EventHandler<ModbusResponseEventArgs> ResponseReceived;

        public ModbusRtuClient(ITransport transport, byte slaveAddress, ILogger logger)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _slaveAddress = slaveAddress;
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
            var pdu = new byte[6];
            pdu[0] = _slaveAddress;
            pdu[1] = 0x03;
            pdu[2] = (byte)(startAddress >> 8);
            pdu[3] = (byte)(startAddress & 0xFF);
            pdu[4] = (byte)(quantity >> 8);
            pdu[5] = (byte)(quantity & 0xFF);

            var frame = AppendCrc(pdu);
            _transport.Send(frame);
            _logger.Info("Modbus RTU FC03: read " + quantity + " registers at " + startAddress);
        }

        /// <summary>
        /// FC06: Write Single Register.
        /// </summary>
        public void WriteSingleRegister(ushort address, ushort value)
        {
            var pdu = new byte[6];
            pdu[0] = _slaveAddress;
            pdu[1] = 0x06;
            pdu[2] = (byte)(address >> 8);
            pdu[3] = (byte)(address & 0xFF);
            pdu[4] = (byte)(value >> 8);
            pdu[5] = (byte)(value & 0xFF);

            var frame = AppendCrc(pdu);
            _transport.Send(frame);
            _logger.Info("Modbus RTU FC06: write " + value + " to register " + address);
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.RawData == null || e.RawData.Length < 5) return;

            try
            {
                if (!ValidateCrc(e.RawData))
                {
                    _logger.Warn("Modbus RTU CRC error");
                    return;
                }

                var functionCode = e.RawData[1];
                ResponseReceived?.Invoke(this, new ModbusResponseEventArgs(functionCode, e.RawData));
            }
            catch (Exception ex)
            {
                _logger.Error("Modbus RTU parse error: " + ex.Message);
            }
        }

        private static byte[] AppendCrc(byte[] data)
        {
            var crc = CalculateCrc16(data);
            var frame = new byte[data.Length + 2];
            Array.Copy(data, frame, data.Length);
            frame[data.Length] = (byte)(crc & 0xFF);       // CRC low byte first
            frame[data.Length + 1] = (byte)(crc >> 8);
            return frame;
        }

        private static bool ValidateCrc(byte[] frame)
        {
            if (frame.Length < 3) return false;
            var data = new byte[frame.Length - 2];
            Array.Copy(frame, data, data.Length);
            var calculated = CalculateCrc16(data);
            var received = (ushort)(frame[frame.Length - 2] | (frame[frame.Length - 1] << 8));
            return calculated == received;
        }

        /// <summary>
        /// Standard Modbus CRC-16 calculation.
        /// </summary>
        private static ushort CalculateCrc16(byte[] data)
        {
            ushort crc = 0xFFFF;
            for (int i = 0; i < data.Length; i++)
            {
                crc ^= data[i];
                for (int j = 0; j < 8; j++)
                {
                    if ((crc & 0x0001) != 0)
                    {
                        crc >>= 1;
                        crc ^= 0xA001;
                    }
                    else
                    {
                        crc >>= 1;
                    }
                }
            }
            return crc;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _transport.DataReceived -= OnDataReceived;
            _transport.Disconnect();
        }
    }
}
