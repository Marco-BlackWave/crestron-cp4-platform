namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Interface for gateway drivers (KNX, Shelly, generic IP gateways).
    /// Provides object-based command/subscribe/poll for multi-point systems.
    /// </summary>
    public interface IGatewayDriver : IDeviceDriver
    {
        void SendCommand(string objectId, string command, string value);
        void Subscribe(string objectId);
        void Poll(string objectId);
    }
}
