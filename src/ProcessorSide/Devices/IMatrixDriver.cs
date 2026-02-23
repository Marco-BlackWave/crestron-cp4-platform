namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Interface for matrix switcher drivers (Wyrestorm, Lightware, AV Pro Edge, etc.).
    /// Provides input-to-output routing, mute, and feedback for AV distribution.
    /// </summary>
    public interface IMatrixDriver : IDeviceDriver
    {
        void Route(int input, int output);
        void RouteAll(int input);
        int GetCurrentRoute(int output);
        void Mute(int output);

        int InputCount { get; }
        int OutputCount { get; }
    }
}
