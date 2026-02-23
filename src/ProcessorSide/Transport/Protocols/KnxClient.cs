using System;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport.Protocols
{
    /// <summary>
    /// KNX/IP tunneling protocol client.
    /// Sends/receives KNX telegrams over TCP (KNXnet/IP tunneling, port 3671).
    /// Covers ~17 KNX/EIB modules from the SIMPL+ library.
    /// </summary>
    public sealed class KnxClient : IDisposable
    {
        private readonly ITransport _transport;
        private readonly ILogger _logger;
        private byte _sequenceCounter;
        private byte _channelId;
        private bool _disposed;

        // KNXnet/IP header constants
        private const byte HEADER_SIZE = 0x06;
        private const byte PROTOCOL_VERSION = 0x10;
        private const ushort CONNECT_REQUEST = 0x0205;
        private const ushort CONNECT_RESPONSE = 0x0206;
        private const ushort TUNNELING_REQUEST = 0x0420;
        private const ushort TUNNELING_ACK = 0x0421;
        private const ushort DISCONNECT_REQUEST = 0x0209;

        // CEMI message codes
        private const byte CEMI_L_DATA_REQ = 0x11;
        private const byte CEMI_L_DATA_IND = 0x29;

        public event EventHandler<KnxTelegramEventArgs> TelegramReceived;

        public KnxClient(ITransport transport, ILogger logger)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _transport.DataReceived += OnDataReceived;
        }

        public void Connect()
        {
            _transport.Connect();
            SendConnectRequest();
            _logger.Info("KNX client connecting");
        }

        /// <summary>
        /// Send a group write to a KNX group address.
        /// groupAddr format: "1/1/1" (main/middle/sub)
        /// </summary>
        public void SendGroupWrite(string groupAddr, byte[] value)
        {
            if (string.IsNullOrEmpty(groupAddr) || value == null) return;

            var destAddr = ParseGroupAddress(groupAddr);
            var cemi = BuildCemiFrame(destAddr, value, isWrite: true);
            var frame = BuildTunnelingRequest(cemi);
            _transport.Send(frame);
            _logger.Info("KNX GroupWrite: " + groupAddr + " = " + BitConverter.ToString(value));
        }

        /// <summary>
        /// Send a group write with a single bit value (for switching).
        /// </summary>
        public void SendGroupWrite(string groupAddr, bool value)
        {
            SendGroupWrite(groupAddr, new byte[] { (byte)(value ? 1 : 0) });
        }

        /// <summary>
        /// Send a group write with an 8-bit value (for dimming, 0-255).
        /// </summary>
        public void SendGroupWrite(string groupAddr, byte value)
        {
            SendGroupWrite(groupAddr, new byte[] { value });
        }

        /// <summary>
        /// Send a group read request to a KNX group address.
        /// </summary>
        public void SendGroupRead(string groupAddr)
        {
            if (string.IsNullOrEmpty(groupAddr)) return;

            var destAddr = ParseGroupAddress(groupAddr);
            var cemi = BuildCemiFrame(destAddr, new byte[0], isWrite: false);
            var frame = BuildTunnelingRequest(cemi);
            _transport.Send(frame);
            _logger.Info("KNX GroupRead: " + groupAddr);
        }

        private void SendConnectRequest()
        {
            // KNXnet/IP Connect Request for tunneling
            var frame = new byte[]
            {
                HEADER_SIZE, PROTOCOL_VERSION, // Header
                (byte)(CONNECT_REQUEST >> 8), (byte)(CONNECT_REQUEST & 0xFF), // Service type
                0x00, 0x1A,                    // Total length: 26 bytes
                // HPAI (Host Protocol Address Information) - control endpoint
                0x08, 0x01,                    // Length 8, UDP
                0x00, 0x00, 0x00, 0x00,        // IP 0.0.0.0 (NAT mode)
                0x00, 0x00,                    // Port 0 (NAT mode)
                // HPAI - data endpoint
                0x08, 0x01,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00,
                // CRI (Connection Request Information)
                0x04, 0x04, 0x02, 0x00         // Length 4, Tunnel, Link layer
            };
            _transport.Send(frame);
        }

        private byte[] BuildTunnelingRequest(byte[] cemiFrame)
        {
            var totalLength = HEADER_SIZE + 4 + cemiFrame.Length; // Header + connection header + CEMI
            var frame = new byte[totalLength];
            var idx = 0;

            // KNXnet/IP header
            frame[idx++] = HEADER_SIZE;
            frame[idx++] = PROTOCOL_VERSION;
            frame[idx++] = (byte)(TUNNELING_REQUEST >> 8);
            frame[idx++] = (byte)(TUNNELING_REQUEST & 0xFF);
            frame[idx++] = (byte)((totalLength >> 8) & 0xFF);
            frame[idx++] = (byte)(totalLength & 0xFF);

            // Connection header
            frame[idx++] = 0x04; // Structure length
            frame[idx++] = _channelId;
            frame[idx++] = _sequenceCounter++;
            frame[idx++] = 0x00; // Reserved

            // CEMI frame
            Array.Copy(cemiFrame, 0, frame, idx, cemiFrame.Length);

            return frame;
        }

        private byte[] BuildCemiFrame(ushort destAddr, byte[] data, bool isWrite)
        {
            var apci = isWrite ? (ushort)0x0080 : (ushort)0x0000; // GroupValueWrite : GroupValueRead
            var dataLen = data.Length;

            // For 1-bit/small values, data is encoded in APCI byte
            if (isWrite && dataLen == 1 && data[0] <= 0x3F)
            {
                var frame = new byte[11];
                frame[0] = CEMI_L_DATA_REQ;
                frame[1] = 0x00; // Additional info length
                frame[2] = 0xBC; // Control 1: standard frame, no repeat, broadcast
                frame[3] = 0xE0; // Control 2: group address, hop count 6
                frame[4] = 0x00; // Source address high (0 = filled by gateway)
                frame[5] = 0x00; // Source address low
                frame[6] = (byte)((destAddr >> 8) & 0xFF);
                frame[7] = (byte)(destAddr & 0xFF);
                frame[8] = 0x01; // Data length
                frame[9] = (byte)(apci >> 8);
                frame[10] = (byte)((apci & 0xFF) | (data[0] & 0x3F));
                return frame;
            }
            else
            {
                var frame = new byte[10 + (isWrite ? dataLen + 1 : 1)];
                frame[0] = CEMI_L_DATA_REQ;
                frame[1] = 0x00;
                frame[2] = 0xBC;
                frame[3] = 0xE0;
                frame[4] = 0x00;
                frame[5] = 0x00;
                frame[6] = (byte)((destAddr >> 8) & 0xFF);
                frame[7] = (byte)(destAddr & 0xFF);
                frame[8] = (byte)(isWrite ? dataLen + 1 : 1);
                frame[9] = (byte)(apci >> 8);

                if (isWrite && dataLen > 0)
                {
                    frame[10] = (byte)(apci & 0xFF);
                    Array.Copy(data, 0, frame, 11, dataLen);
                }
                else
                {
                    frame[10] = (byte)(apci & 0xFF);
                }

                return frame;
            }
        }

        private static ushort ParseGroupAddress(string addr)
        {
            // Format: "main/middle/sub" → 5-bit main, 3-bit middle, 8-bit sub
            var parts = addr.Split('/');
            if (parts.Length == 3 &&
                int.TryParse(parts[0], out var main) &&
                int.TryParse(parts[1], out var middle) &&
                int.TryParse(parts[2], out var sub))
            {
                return (ushort)(((main & 0x1F) << 11) | ((middle & 0x07) << 8) | (sub & 0xFF));
            }

            // Try 2-level: "main/sub"
            if (parts.Length == 2 &&
                int.TryParse(parts[0], out var mainAddr) &&
                int.TryParse(parts[1], out var subAddr))
            {
                return (ushort)(((mainAddr & 0x1F) << 11) | (subAddr & 0x7FF));
            }

            return 0;
        }

        private static string FormatGroupAddress(ushort addr)
        {
            var main = (addr >> 11) & 0x1F;
            var middle = (addr >> 8) & 0x07;
            var sub = addr & 0xFF;
            return main + "/" + middle + "/" + sub;
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.RawData == null || e.RawData.Length < 6) return;

            try
            {
                var serviceType = (ushort)((e.RawData[2] << 8) | e.RawData[3]);

                switch (serviceType)
                {
                    case CONNECT_RESPONSE:
                        if (e.RawData.Length >= 8)
                        {
                            _channelId = e.RawData[6];
                            var status = e.RawData[7];
                            if (status == 0)
                                _logger.Info("KNX connected, channel " + _channelId);
                            else
                                _logger.Error("KNX connect failed, status " + status);
                        }
                        break;

                    case TUNNELING_REQUEST:
                        ParseTunnelingIndication(e.RawData);
                        SendTunnelingAck(e.RawData);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.Error("KNX parse error: " + ex.Message);
            }
        }

        private void ParseTunnelingIndication(byte[] data)
        {
            // Header(6) + ConnectionHeader(4) + CEMI
            if (data.Length < 17) return;

            var cemiOffset = 10; // Past header + connection header
            var msgCode = data[cemiOffset];

            if (msgCode != CEMI_L_DATA_IND) return;

            var addInfoLen = data[cemiOffset + 1];
            var dataOffset = cemiOffset + 2 + addInfoLen;

            if (data.Length < dataOffset + 8) return;

            var destHigh = data[dataOffset + 4];
            var destLow = data[dataOffset + 5];
            var destAddr = (ushort)((destHigh << 8) | destLow);
            var dataLen = data[dataOffset + 6];

            // Extract APCI and value
            var apci = (ushort)((data[dataOffset + 7] << 8) |
                               (data.Length > dataOffset + 8 ? data[dataOffset + 8] : 0));
            var apciCommand = apci & 0x03C0;

            byte[] value;
            if (dataLen <= 1)
            {
                // Small value encoded in APCI
                value = new byte[] { (byte)(data[dataOffset + 8] & 0x3F) };
            }
            else
            {
                value = new byte[dataLen - 1];
                if (data.Length >= dataOffset + 9 + value.Length)
                    Array.Copy(data, dataOffset + 9, value, 0, value.Length);
            }

            var groupAddr = FormatGroupAddress(destAddr);
            TelegramReceived?.Invoke(this, new KnxTelegramEventArgs(groupAddr, value, apciCommand == 0x0040));
        }

        private void SendTunnelingAck(byte[] request)
        {
            if (request.Length < 10) return;
            var ack = new byte[]
            {
                HEADER_SIZE, PROTOCOL_VERSION,
                (byte)(TUNNELING_ACK >> 8), (byte)(TUNNELING_ACK & 0xFF),
                0x00, 0x0A,          // Length: 10
                0x04,                // Connection header length
                request[7],          // Channel ID
                request[8],          // Sequence counter
                0x00                 // Status: OK
            };
            _transport.Send(ack);
        }

        public void Disconnect()
        {
            var frame = new byte[]
            {
                HEADER_SIZE, PROTOCOL_VERSION,
                (byte)(DISCONNECT_REQUEST >> 8), (byte)(DISCONNECT_REQUEST & 0xFF),
                0x00, 0x10,
                _channelId, 0x00,
                0x08, 0x01,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00
            };
            _transport.Send(frame);
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            try { Disconnect(); } catch { }
            _transport.DataReceived -= OnDataReceived;
            _transport.Disconnect();
        }
    }

    public sealed class KnxTelegramEventArgs : EventArgs
    {
        public string GroupAddress { get; }
        public byte[] Value { get; }
        public bool IsResponse { get; }

        public KnxTelegramEventArgs(string groupAddress, byte[] value, bool isResponse)
        {
            GroupAddress = groupAddress;
            Value = value;
            IsResponse = isResponse;
        }
    }
}
