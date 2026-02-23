using System;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Base interface for all device drivers.
    /// Drivers are transport-agnostic — they receive an ITransport at initialization.
    /// </summary>
    public interface IDeviceDriver : IDisposable
    {
        string DeviceId { get; }
        bool IsOnline { get; }
        void Initialize(ITransport transport);
        event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;
    }

    public sealed class DeviceFeedbackEventArgs : EventArgs
    {
        public string Property { get; }
        public object Value { get; }

        public DeviceFeedbackEventArgs(string property, object value)
        {
            Property = property;
            Value = value;
        }
    }
}
