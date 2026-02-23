using System;
using System.Text;
using Crestron.SimplSharp.CrestronSockets;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport
{
    /// <summary>
    /// TCP client transport wrapping Crestron TCPClient.
    /// Handles connection, reconnection, send, and receive.
    /// </summary>
    public sealed class TcpTransport : ITransport
    {
        private readonly string _address;
        private readonly int _port;
        private readonly ILogger _logger;
        private TCPClient _client;
        private bool _disposed;
        private bool _shouldReconnect;

        public string Id { get; }
        public bool IsConnected => _client != null && _client.ClientStatus == SocketStatus.SOCKET_STATUS_CONNECTED;

        public event EventHandler<TransportDataEventArgs> DataReceived;

        public TcpTransport(string id, string address, int port, ILogger logger)
        {
            Id = id ?? throw new ArgumentNullException(nameof(id));
            _address = address ?? throw new ArgumentNullException(nameof(address));
            _port = port;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Connect()
        {
            _shouldReconnect = true;
            _client = new TCPClient(_address, _port, 4096);
            _client.SocketStatusChange += OnSocketStatusChange;
            var result = _client.ConnectToServerAsync(OnConnectCallback);
            if (result != SocketErrorCodes.SOCKET_OK && result != SocketErrorCodes.SOCKET_CONNECTION_IN_PROGRESS)
            {
                _logger.Error("TCP connect failed for " + Id + ": " + result);
            }
        }

        public void Disconnect()
        {
            _shouldReconnect = false;
            if (_client != null)
            {
                _client.SocketStatusChange -= OnSocketStatusChange;
                _client.DisconnectFromServer();
                _logger.Info("TCP disconnected: " + Id);
            }
        }

        public void Send(string data)
        {
            if (!IsConnected || string.IsNullOrEmpty(data)) return;
            var bytes = Encoding.UTF8.GetBytes(data);
            _client.SendData(bytes, bytes.Length);
        }

        public void Send(byte[] data)
        {
            if (!IsConnected || data == null || data.Length == 0) return;
            _client.SendData(data, data.Length);
        }

        private void OnConnectCallback(TCPClient client)
        {
            if (client.ClientStatus == SocketStatus.SOCKET_STATUS_CONNECTED)
            {
                _logger.Info("TCP connected: " + Id + " → " + _address + ":" + _port);
                client.ReceiveDataAsync(OnReceiveCallback);
            }
            else
            {
                _logger.Warn("TCP connection failed for " + Id + ": " + client.ClientStatus);
            }
        }

        private void OnReceiveCallback(TCPClient client, int bytesReceived)
        {
            if (bytesReceived > 0)
            {
                try
                {
                    var data = new byte[bytesReceived];
                    Array.Copy(client.IncomingDataBuffer, data, bytesReceived);
                    DataReceived?.Invoke(this, new TransportDataEventArgs(data));
                }
                catch (Exception ex)
                {
                    _logger.Error("TCP receive error on " + Id + ": " + ex.Message);
                }

                if (IsConnected)
                {
                    client.ReceiveDataAsync(OnReceiveCallback);
                }
            }
        }

        private void OnSocketStatusChange(TCPClient client, SocketStatus status)
        {
            _logger.Info("TCP " + Id + " status: " + status);

            if (status == SocketStatus.SOCKET_STATUS_NO_CONNECT && _shouldReconnect && !_disposed)
            {
                _logger.Info("TCP " + Id + " attempting reconnect...");
                client.ConnectToServerAsync(OnConnectCallback);
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            Disconnect();
            _client = null;
        }
    }
}
