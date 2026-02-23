using System;
using System.Text;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport.Protocols
{
    /// <summary>
    /// Art-Net DMX protocol client (UDP port 6454).
    /// Sends DMX512 frames via Art-Net protocol for lighting control.
    /// Covers ~4 Art-Net/DMX modules from the SIMPL+ library.
    /// </summary>
    public sealed class ArtNetClient : IDisposable
    {
        private readonly ITransport _transport;
        private readonly ILogger _logger;
        private readonly byte[][] _universeData;
        private byte _sequence;
        private bool _disposed;

        // Art-Net constants
        private static readonly byte[] ART_NET_ID = Encoding.ASCII.GetBytes("Art-Net\0");
        private const ushort OPCODE_OUTPUT = 0x5000; // ArtDmx
        private const ushort OPCODE_POLL = 0x2000;
        private const ushort OPCODE_POLL_REPLY = 0x2100;
        private const int DMX_CHANNELS = 512;
        private const int MAX_UNIVERSES = 4;

        public event EventHandler<ArtNetDmxEventArgs> DmxReceived;

        public ArtNetClient(ITransport transport, ILogger logger)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _transport.DataReceived += OnDataReceived;

            _universeData = new byte[MAX_UNIVERSES][];
            for (int i = 0; i < MAX_UNIVERSES; i++)
                _universeData[i] = new byte[DMX_CHANNELS];
        }

        public void Connect()
        {
            _transport.Connect();
            _logger.Info("Art-Net client connected (UDP 6454)");
        }

        /// <summary>
        /// Set a single DMX channel value in a universe.
        /// Channel: 1-512, Value: 0-255
        /// </summary>
        public void SetChannel(int universe, int channel, byte value)
        {
            if (universe < 0 || universe >= MAX_UNIVERSES) return;
            if (channel < 1 || channel > DMX_CHANNELS) return;

            _universeData[universe][channel - 1] = value;
            SendDmxFrame(universe);
        }

        /// <summary>
        /// Set a range of DMX channels starting at startChannel.
        /// </summary>
        public void SetChannels(int universe, int startChannel, byte[] values)
        {
            if (universe < 0 || universe >= MAX_UNIVERSES || values == null) return;
            if (startChannel < 1) return;

            for (int i = 0; i < values.Length && (startChannel - 1 + i) < DMX_CHANNELS; i++)
            {
                _universeData[universe][startChannel - 1 + i] = values[i];
            }

            SendDmxFrame(universe);
        }

        /// <summary>
        /// Send a complete DMX frame for a universe.
        /// </summary>
        public void SendDmxFrame(int universe)
        {
            SendDmxFrame(universe, _universeData[universe]);
        }

        /// <summary>
        /// Send a complete DMX frame with custom data.
        /// </summary>
        public void SendDmxFrame(int universe, byte[] data)
        {
            if (data == null || universe < 0 || universe >= MAX_UNIVERSES) return;

            // Art-Net ArtDmx packet
            var channelCount = Math.Min(data.Length, DMX_CHANNELS);
            // Ensure even channel count per Art-Net spec
            if (channelCount % 2 != 0) channelCount++;

            var frame = new byte[18 + channelCount];
            var idx = 0;

            // Art-Net ID (8 bytes)
            Array.Copy(ART_NET_ID, 0, frame, idx, 8);
            idx += 8;

            // OpCode (little-endian)
            frame[idx++] = (byte)(OPCODE_OUTPUT & 0xFF);
            frame[idx++] = (byte)((OPCODE_OUTPUT >> 8) & 0xFF);

            // Protocol version (big-endian)
            frame[idx++] = 0x00;
            frame[idx++] = 0x0E; // Version 14

            // Sequence
            frame[idx++] = _sequence++;

            // Physical port
            frame[idx++] = 0x00;

            // Universe (little-endian)
            frame[idx++] = (byte)(universe & 0xFF);
            frame[idx++] = (byte)((universe >> 8) & 0xFF);

            // Channel count (big-endian)
            frame[idx++] = (byte)((channelCount >> 8) & 0xFF);
            frame[idx++] = (byte)(channelCount & 0xFF);

            // DMX data
            var copyLen = Math.Min(data.Length, channelCount);
            Array.Copy(data, 0, frame, idx, copyLen);

            _transport.Send(frame);
        }

        /// <summary>
        /// Send Art-Net poll to discover nodes.
        /// </summary>
        public void SendPoll()
        {
            var frame = new byte[14];
            Array.Copy(ART_NET_ID, 0, frame, 0, 8);
            frame[8] = (byte)(OPCODE_POLL & 0xFF);
            frame[9] = (byte)((OPCODE_POLL >> 8) & 0xFF);
            frame[10] = 0x00;
            frame[11] = 0x0E; // Protocol version
            frame[12] = 0x00; // Flags
            frame[13] = 0x00; // Priority
            _transport.Send(frame);
            _logger.Info("Art-Net poll sent");
        }

        /// <summary>
        /// Black out all channels in a universe.
        /// </summary>
        public void Blackout(int universe)
        {
            if (universe < 0 || universe >= MAX_UNIVERSES) return;
            Array.Clear(_universeData[universe], 0, DMX_CHANNELS);
            SendDmxFrame(universe);
            _logger.Info("Art-Net blackout universe " + universe);
        }

        private void OnDataReceived(object sender, TransportDataEventArgs e)
        {
            if (e.RawData == null || e.RawData.Length < 12) return;

            try
            {
                // Verify Art-Net header
                for (int i = 0; i < 8; i++)
                {
                    if (e.RawData[i] != ART_NET_ID[i]) return;
                }

                var opCode = (ushort)(e.RawData[8] | (e.RawData[9] << 8));

                if (opCode == OPCODE_OUTPUT && e.RawData.Length >= 18)
                {
                    var universe = e.RawData[14] | (e.RawData[15] << 8);
                    var channelCount = (e.RawData[16] << 8) | e.RawData[17];
                    var dmxData = new byte[Math.Min(channelCount, e.RawData.Length - 18)];
                    Array.Copy(e.RawData, 18, dmxData, 0, dmxData.Length);

                    DmxReceived?.Invoke(this, new ArtNetDmxEventArgs(universe, dmxData));
                }
            }
            catch (Exception ex)
            {
                _logger.Error("Art-Net parse error: " + ex.Message);
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

    public sealed class ArtNetDmxEventArgs : EventArgs
    {
        public int Universe { get; }
        public byte[] Data { get; }

        public ArtNetDmxEventArgs(int universe, byte[] data)
        {
            Universe = universe;
            Data = data;
        }
    }
}
