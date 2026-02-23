namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Interface for security panel drivers (DSC IT-100, Elk M1, etc.).
    /// Provides arm/disarm control, zone status, and alarm state.
    /// </summary>
    public interface ISecurityDriver : IDeviceDriver
    {
        void ArmAway();
        void ArmStay();
        void ArmNight();
        void Disarm(string code);
        void StatusRequest();
        void Panic();

        string ArmMode { get; }
        bool IsAlarmActive { get; }
        bool IsReady { get; }
        bool IsTrouble { get; }

        bool IsZoneOpen(int zone);
        int ZoneCount { get; }
    }
}
