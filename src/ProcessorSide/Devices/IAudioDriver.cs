namespace CrestronCP4.ProcessorSide.Devices
{
    public interface IAudioDriver : IDeviceDriver
    {
        void SetVolume(int level);
        void VolumeUp();
        void VolumeDown();
        void MuteToggle();
        int Volume { get; }
        bool IsMuted { get; }
    }
}
