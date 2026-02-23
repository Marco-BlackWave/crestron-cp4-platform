using System;
using System.Text;
using Crestron.SimplSharpPro;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport
{
    /// <summary>
    /// Serial transport wrapping a Crestron ComPort (RS-232/422/485).
    /// Configurable baud rate, data bits, parity, stop bits.
    /// </summary>
    public sealed class SerialTransport : ITransport
    {
        private readonly ComPort _port;
        private readonly ILogger _logger;
        private readonly ComPort.ComPortSpec _spec;
        private bool _disposed;

        public string Id { get; }
        public bool IsConnected { get; private set; }

        public event EventHandler<TransportDataEventArgs> DataReceived;

        public SerialTransport(string id, ComPort port, ComPort.ComPortSpec spec, ILogger logger)
        {
            Id = id ?? throw new ArgumentNullException(nameof(id));
            _port = port ?? throw new ArgumentNullException(nameof(port));
            _spec = spec;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Connect()
        {
            _port.SetComPortSpec(_spec);
            _port.SerialDataReceived += OnSerialDataReceived;
            _port.Register();
            IsConnected = true;
            _logger.Info("Serial connected: " + Id);
        }

        public void Disconnect()
        {
            _port.SerialDataReceived -= OnSerialDataReceived;
            IsConnected = false;
            _logger.Info("Serial disconnected: " + Id);
        }

        public void Send(string data)
        {
            if (!IsConnected || string.IsNullOrEmpty(data)) return;
            _port.Send(data);
        }

        public void Send(byte[] data)
        {
            if (!IsConnected || data == null || data.Length == 0) return;
            _port.Send(Encoding.GetEncoding(28591).GetString(data, 0, data.Length));
        }

        private void OnSerialDataReceived(ComPort port, ComPortDataEventArgs args)
        {
            try
            {
                DataReceived?.Invoke(this, new TransportDataEventArgs(args.SerialData));
            }
            catch (Exception ex)
            {
                _logger.Error("Serial receive error on " + Id + ": " + ex.Message);
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            Disconnect();
        }
    }
}
