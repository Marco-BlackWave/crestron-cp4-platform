using System;
using System.Text;
using Crestron.SimplSharp.CrestronSockets;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport
{
    /// <summary>
    /// UDP transport wrapping Crestron UDPServer for send and receive.
    /// </summary>
    public sealed class UdpTransport : ITransport
    {
        private readonly string _remoteAddress;
        private readonly int _remotePort;
        private readonly int _localPort;
        private readonly ILogger _logger;
        private UDPServer _server;
        private bool _disposed;

        public string Id { get; }
        public bool IsConnected => _server != null;

        public event EventHandler<TransportDataEventArgs> DataReceived;

        public UdpTransport(string id, string remoteAddress, int remotePort, int localPort, ILogger logger)
        {
            Id = id ?? throw new ArgumentNullException(nameof(id));
            _remoteAddress = remoteAddress ?? throw new ArgumentNullException(nameof(remoteAddress));
            _remotePort = remotePort;
            _localPort = localPort;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Connect()
        {
            _server = new UDPServer(_localPort, 4096);
            _server.EnableUDPServer();
            _server.ReceiveDataAsync(OnReceiveCallback);
            _logger.Info("UDP listening on port " + _localPort + " for " + Id);
        }

        public void Disconnect()
        {
            if (_server != null)
            {
                _server.DisableUDPServer();
                _logger.Info("UDP disconnected: " + Id);
            }
        }

        public void Send(string data)
        {
            if (_server == null || string.IsNullOrEmpty(data)) return;
            var bytes = Encoding.UTF8.GetBytes(data);
            _server.SendData(bytes, bytes.Length, _remoteAddress, _remotePort);
        }

        public void Send(byte[] data)
        {
            if (_server == null || data == null || data.Length == 0) return;
            _server.SendData(data, data.Length, _remoteAddress, _remotePort);
        }

        private void OnReceiveCallback(UDPServer server, int bytesReceived)
        {
            if (bytesReceived > 0)
            {
                try
                {
                    var data = new byte[bytesReceived];
                    Array.Copy(server.IncomingDataBuffer, data, bytesReceived);
                    DataReceived?.Invoke(this, new TransportDataEventArgs(data));
                }
                catch (Exception ex)
                {
                    _logger.Error("UDP receive error on " + Id + ": " + ex.Message);
                }
            }

            if (!_disposed)
            {
                server.ReceiveDataAsync(OnReceiveCallback);
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            Disconnect();
            _server = null;
        }
    }
}
