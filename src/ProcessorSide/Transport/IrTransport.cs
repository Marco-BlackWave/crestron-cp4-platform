using System;
using Crestron.SimplSharpPro;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport
{
    /// <summary>
    /// IR transport wrapping a Crestron IROutputPort.
    /// Loads .ir driver files and sends named IR commands.
    /// IR is one-way — DataReceived is never raised.
    /// </summary>
    public sealed class IrTransport : ITransport
    {
        private readonly IROutputPort _port;
        private readonly ILogger _logger;
        private bool _disposed;

        public string Id { get; }
        public bool IsConnected => !_disposed;

        public event EventHandler<TransportDataEventArgs> DataReceived;

        public IrTransport(string id, IROutputPort port, ILogger logger)
        {
            Id = id ?? throw new ArgumentNullException(nameof(id));
            _port = port ?? throw new ArgumentNullException(nameof(port));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void LoadDriver(string driverPath)
        {
            _port.LoadIRDriver(driverPath);
            _logger.Info("IR driver loaded: " + driverPath + " on " + Id);
        }

        public void Connect()
        {
            // IR ports are always available once the processor boots
        }

        public void Disconnect()
        {
            // No disconnect needed for IR
        }

        /// <summary>
        /// Sends a named IR command (e.g., "POWER_ON", "HDMI_1").
        /// The command name must match entries in the loaded .ir driver file.
        /// </summary>
        public void Send(string command)
        {
            if (string.IsNullOrWhiteSpace(command)) return;
            _port.Press(command);
            _logger.Info("IR: " + Id + " → " + command);
        }

        public void Send(byte[] data)
        {
            // IR does not support raw byte sending
            _logger.Warn("IR transport does not support raw byte data.");
        }

        public void Dispose()
        {
            _disposed = true;
        }
    }
}
