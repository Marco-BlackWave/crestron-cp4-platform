using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    /// <summary>
    /// Dedicated BSS Soundweb London driver implementing HiQnet binary protocol.
    /// Cannot be profile-driven due to complex binary frame construction.
    /// </summary>
    public sealed class BssSoundwebDriver : IDspDriver
    {
        private readonly ILogger _logger;
        private ITransport _transport;
        private readonly Dictionary<int, int> _levels = new Dictionary<int, int>();
        private readonly HashSet<int> _subscribedChannels = new HashSet<int>();
        private bool _disposed;

        // HiQnet protocol constants
        private const byte STX = 0x02;
        private const byte ETX = 0x03;
        private const byte MSG_SET = 0x88;
        private const byte MSG_SUBSCRIBE = 0x89;
        private const byte MSG_UNSUBSCRIBE = 0x8A;
        private const byte MSG_SET_PERCENT = 0x8D;

        public string DeviceId { get; }
        public bool IsOnline => _transport != null && _transport.IsConnected;

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public BssSoundwebDriver(string deviceId, ILogger logger)
        {
            DeviceId = deviceId ?? throw new ArgumentNullException(nameof(deviceId));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Initialize(ITransport transport)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _transport.DataReceived += OnDataReceived;
            _transport.Connect();
            _logger.Info("BSS Soundweb initialized: " + DeviceId);
        }

        public void SetLevel(int channel, int level)
        {
            // HiQnet SET message: STX + nodeAddr(6) + virtualDevice(3) + objectId(3) + paramId(2) + value(4) + checksum + ETX
            var frame = BuildHiQnetFrame(MSG_SET_PERCENT, channel, level);
            _transport?.Send(frame);
            _levels[channel] = level;
            RaiseFeedback("level_ch" + channel, level);
            _logger.Info(DeviceId + ": set channel " + channel + " level to " + level);
        }

        public void SetMute(int channel, bool muted)
        {
            var value = muted ? 1 : 0;
            var frame = BuildHiQnetFrame(MSG_SET, channel + 0x1000, value); // Mute params offset by 0x1000
            _transport?.Send(frame);
            RaiseFeedback("mute_ch" + channel, muted);
        }

        public int GetLevel(int channel)
        {
            _levels.TryGetValue(channel, out var level);
            return level;
        }

        public void Subscribe(int channel)
        {
            _subscribedChannels.Add(channel);
            var frame = BuildHiQnetFrame(MSG_SUBSCRIBE, channel, 0);
            _transport?.Send(frame);
            _logger.Info(DeviceId + ": subscribed to channel " + channel);
        }

        public void Unsubscribe(int channel)
        {
            _subscribedChannels.Remove(channel);
            var frame = BuildHiQnetFrame(MSG_UNSUBSCRIBE, channel, 0);
            _transport?.Send(frame);
        }

        private byte[] BuildHiQnetFrame(byte messageType, int paramId, int value)
        {
            // Simplified HiQnet frame construction
            // Real implementation would include full node addressing
            var frame = new byte[20];
            var idx = 0;

            frame[idx++] = STX;
            // Message type
            frame[idx++] = messageType;
            // Node address (6 bytes placeholder)
            frame[idx++] = 0x00; frame[idx++] = 0x00; frame[idx++] = 0x00;
            frame[idx++] = 0x00; frame[idx++] = 0x00; frame[idx++] = 0x00;
            // Virtual device (3 bytes)
            frame[idx++] = 0x03;
            frame[idx++] = 0x00;
            frame[idx++] = 0x01;
            // Object + param ID (2 bytes)
            frame[idx++] = (byte)((paramId >> 8) & 0xFF);
            frame[idx++] = (byte)(paramId & 0xFF);
            // Value (4 bytes big-endian)
            frame[idx++] = (byte)((value >> 24) & 0xFF);
            frame[idx++] = (byte)((value >> 16) & 0xFF);
            frame[idx++] = (byte)((value >> 8) & 0xFF);
            frame[idx++] = (byte)(value & 0xFF);
            // Checksum
            byte checksum = 0;
            for (int i = 1; i < idx; i++) checksum ^= frame[i];
            frame[idx++] = checksum;
            frame[idx++] = ETX;

            var result = new byte[idx];
            Array.Copy(frame, result, idx);
            return result;
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.RawData == null || e.RawData.Length < 10) return;

            try
            {
                ParseHiQnetResponse(e.RawData);
            }
            catch (Exception ex)
            {
                _logger.Error(DeviceId + " HiQnet parse error: " + ex.Message);
            }
        }

        private void ParseHiQnetResponse(byte[] data)
        {
            // Find STX marker
            int start = -1;
            for (int i = 0; i < data.Length; i++)
            {
                if (data[i] == STX) { start = i; break; }
            }
            if (start < 0 || data.Length < start + 18) return;

            var msgType = data[start + 1];
            if (msgType == MSG_SET || msgType == MSG_SET_PERCENT)
            {
                var paramId = (data[start + 11] << 8) | data[start + 12];
                var value = (data[start + 13] << 24) | (data[start + 14] << 16) |
                           (data[start + 15] << 8) | data[start + 16];

                // Check if this is a mute parameter (offset by 0x1000)
                if (paramId >= 0x1000)
                {
                    var channel = paramId - 0x1000;
                    RaiseFeedback("mute_ch" + channel, value != 0);
                }
                else
                {
                    _levels[paramId] = value;
                    RaiseFeedback("level_ch" + paramId, value);
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
            _subscribedChannels.Clear();
            if (_transport != null)
            {
                _transport.DataReceived -= OnDataReceived;
                _transport.Disconnect();
            }
        }
    }
}
