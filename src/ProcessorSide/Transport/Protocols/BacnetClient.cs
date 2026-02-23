using System;
using System.Text;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport.Protocols
{
    /// <summary>
    /// BACnet/IP protocol client for reading and writing BACnet objects.
    /// Built on top of ITransport (UDP on port 47808).
    /// Crestron CP4 free license supports up to 50 BACnet objects.
    /// Supports: Binary Input/Output, Analog Input/Output, Multi-State.
    /// </summary>
    public sealed class BacnetClient : IDisposable
    {
        private readonly ITransport _transport;
        private readonly ILogger _logger;
        private byte _invokeId;
        private bool _disposed;

        public event EventHandler<BacnetResponseEventArgs> ResponseReceived;

        public BacnetClient(ITransport transport, ILogger logger)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _transport.DataReceived += OnDataReceived;
        }

        public void Connect()
        {
            _transport.Connect();
            _logger.Info("BACnet client connected");
        }

        /// <summary>
        /// ReadProperty: reads a property from a BACnet object.
        /// </summary>
        public void ReadProperty(uint objectType, uint objectInstance, uint propertyId)
        {
            // Simplified BACnet ReadProperty request
            // In production, use full ASN.1/BER encoding
            var request = BuildReadPropertyRequest(objectType, objectInstance, propertyId);
            _transport.Send(request);
            _logger.Info("BACnet ReadProperty: type=" + objectType + " instance=" + objectInstance + " prop=" + propertyId);
        }

        /// <summary>
        /// WriteProperty: writes a value to a BACnet object property.
        /// </summary>
        public void WriteProperty(uint objectType, uint objectInstance, uint propertyId, float value)
        {
            var request = BuildWritePropertyRequest(objectType, objectInstance, propertyId, value);
            _transport.Send(request);
            _logger.Info("BACnet WriteProperty: type=" + objectType + " instance=" + objectInstance + " value=" + value);
        }

        /// <summary>
        /// Read Analog Value present value (property 85).
        /// Common use: temperature readings.
        /// </summary>
        public void ReadAnalogValue(uint objectInstance)
        {
            ReadProperty(2, objectInstance, 85); // Object type 2 = Analog Value, Property 85 = Present Value
        }

        /// <summary>
        /// Write Analog Value present value.
        /// Common use: setpoint changes.
        /// </summary>
        public void WriteAnalogValue(uint objectInstance, float value)
        {
            WriteProperty(2, objectInstance, 85, value);
        }

        /// <summary>
        /// Read Binary Value present value.
        /// Common use: on/off state.
        /// </summary>
        public void ReadBinaryValue(uint objectInstance)
        {
            ReadProperty(5, objectInstance, 85); // Object type 5 = Binary Value
        }

        /// <summary>
        /// Read Multi-State Value present value.
        /// Common use: HVAC mode (heat/cool/auto/off).
        /// </summary>
        public void ReadMultiStateValue(uint objectInstance)
        {
            ReadProperty(19, objectInstance, 85); // Object type 19 = Multi-State Value
        }

        private byte[] BuildReadPropertyRequest(uint objectType, uint objectInstance, uint propertyId)
        {
            // BACnet/IP BVLC header + NPDU + APDU
            // This is a simplified implementation
            var invokeId = _invokeId++;
            var frame = new byte[]
            {
                0x81, 0x0A,             // BVLC: Original-Unicast-NPDU
                0x00, 0x11,             // Length (placeholder)
                0x01, 0x04,             // NPDU: Version 1, no DNET
                0x00,                   // APDU: Confirmed Request
                0x04,                   // Max segments / max APDU size
                invokeId,               // Invoke ID
                0x0C,                   // Service: ReadProperty
                // Object Identifier
                (byte)((objectType >> 6) & 0xFF),
                (byte)(((objectType & 0x3F) << 2) | ((objectInstance >> 20) & 0x03)),
                (byte)((objectInstance >> 12) & 0xFF),
                (byte)((objectInstance >> 4) & 0xFF),
                (byte)((objectInstance & 0x0F) << 4),
                // Property Identifier
                0x19, (byte)propertyId
            };
            // Fix length
            frame[2] = (byte)((frame.Length >> 8) & 0xFF);
            frame[3] = (byte)(frame.Length & 0xFF);
            return frame;
        }

        private byte[] BuildWritePropertyRequest(uint objectType, uint objectInstance, uint propertyId, float value)
        {
            var invokeId = _invokeId++;
            var valueBytes = BitConverter.GetBytes(value);
            if (BitConverter.IsLittleEndian)
            {
                Array.Reverse(valueBytes);
            }

            var frame = new byte[]
            {
                0x81, 0x0A,             // BVLC
                0x00, 0x19,             // Length (placeholder)
                0x01, 0x04,             // NPDU
                0x00,                   // Confirmed Request
                0x04,
                invokeId,
                0x0F,                   // Service: WriteProperty
                // Object Identifier
                (byte)((objectType >> 6) & 0xFF),
                (byte)(((objectType & 0x3F) << 2) | ((objectInstance >> 20) & 0x03)),
                (byte)((objectInstance >> 12) & 0xFF),
                (byte)((objectInstance >> 4) & 0xFF),
                (byte)((objectInstance & 0x0F) << 4),
                // Property Identifier
                0x19, (byte)propertyId,
                // Value (Real/Float)
                0x3E,                   // Opening tag
                0x44,                   // Application tag: Real
                valueBytes[0], valueBytes[1], valueBytes[2], valueBytes[3],
                0x3F                    // Closing tag
            };
            frame[2] = (byte)((frame.Length >> 8) & 0xFF);
            frame[3] = (byte)(frame.Length & 0xFF);
            return frame;
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.RawData == null || e.RawData.Length < 6) return;

            try
            {
                ResponseReceived?.Invoke(this, new BacnetResponseEventArgs(e.RawData));
            }
            catch (Exception ex)
            {
                _logger.Error("BACnet parse error: " + ex.Message);
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

    public sealed class BacnetResponseEventArgs : EventArgs
    {
        public byte[] RawData { get; }

        public BacnetResponseEventArgs(byte[] rawData)
        {
            RawData = rawData;
        }
    }
}
