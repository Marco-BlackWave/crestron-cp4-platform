using System;

namespace CrestronCP4.ProcessorSide.Transport
{
    /// <summary>
    /// Core transport abstraction for all device communication protocols.
    /// Implementations wrap Crestron-specific hardware (IR, COM, TCP, UDP).
    /// </summary>
    public interface ITransport : IDisposable
    {
        string Id { get; }
        bool IsConnected { get; }
        void Connect();
        void Disconnect();
        void Send(string data);
        void Send(byte[] data);
        event EventHandler<TransportDataEventArgs> DataReceived;
    }

    public sealed class TransportDataEventArgs : EventArgs
    {
        public string Data { get; }
        public byte[] RawData { get; }

        public TransportDataEventArgs(string data)
        {
            Data = data;
            RawData = null;
        }

        public TransportDataEventArgs(byte[] rawData)
        {
            RawData = rawData;
            Data = null;
        }
    }
}
