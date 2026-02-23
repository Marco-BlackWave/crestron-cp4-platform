namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Interface for DSP/mixer drivers (BSS Soundweb, Biamp, QSC, etc.).
    /// Provides per-channel level/mute control and subscription for feedback.
    /// </summary>
    public interface IDspDriver : IDeviceDriver
    {
        void SetLevel(int channel, int level);
        void SetMute(int channel, bool muted);
        int GetLevel(int channel);
        void Subscribe(int channel);
        void Unsubscribe(int channel);
    }
}
