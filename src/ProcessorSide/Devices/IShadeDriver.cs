namespace CrestronCP4.ProcessorSide.Devices
{
    public interface IShadeDriver : IDeviceDriver
    {
        void Open(string shadeId);
        void Close(string shadeId);
        void Stop(string shadeId);
        void SetPosition(string shadeId, int percent);
        int GetPosition(string shadeId);
    }
}
