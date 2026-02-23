namespace CrestronCP4.ProcessorSide.Devices
{
    public interface IHvacDriver : IDeviceDriver
    {
        void SetSetpoint(int temp);
        void SetMode(string mode);
        int CurrentTemp { get; }
        int Setpoint { get; }
        string Mode { get; }
    }
}
