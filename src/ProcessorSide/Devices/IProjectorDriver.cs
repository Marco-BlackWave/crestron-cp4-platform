namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Interface for projector drivers (Epson, Optoma, PJLink, etc.).
    /// Extends IDisplayDriver with projector-specific features.
    /// </summary>
    public interface IProjectorDriver : IDisplayDriver
    {
        void SetLensPosition(int position);
        void Freeze();
        void Blank();
        int LampHours { get; }
    }
}
