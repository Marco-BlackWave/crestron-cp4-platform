namespace CrestronCP4.ProcessorSide.Devices
{
    public interface IDisplayDriver : IDeviceDriver
    {
        void PowerOn();
        void PowerOff();
        void SelectInput(string inputId);
        bool IsPoweredOn { get; }
    }
}
