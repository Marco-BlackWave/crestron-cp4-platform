namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Interface for media/streaming drivers (Apple TV, Roku, Sonos, Kaleidescape, etc.).
    /// Provides transport controls and now-playing metadata feedback.
    /// </summary>
    public interface IMediaDriver : IDeviceDriver
    {
        void Play();
        void Pause();
        void Stop();
        void Next();
        void Previous();
        void Seek(int position);

        bool IsPlaying { get; }
        string TrackName { get; }
        string Artist { get; }
        string Album { get; }
        int Position { get; }
        int Duration { get; }
    }
}
