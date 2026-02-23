using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Devices;

namespace CrestronCP4.ProcessorSide.Subsystems
{
    /// <summary>
    /// Creates a subsystem for a specific type name.
    /// Register implementations with SubsystemFactory to support new subsystem types
    /// without modifying factory code.
    /// </summary>
    public interface ISubsystemCreator
    {
        /// <summary>
        /// The subsystem type name this creator handles (e.g. "av", "lighting", "shades", "hvac").
        /// Case-insensitive matching.
        /// </summary>
        string SubsystemType { get; }

        /// <summary>
        /// Creates a subsystem instance for the given room.
        /// </summary>
        /// <param name="room">Room configuration</param>
        /// <param name="deviceManager">Device manager for driver access</param>
        /// <param name="logger">Logger instance</param>
        /// <returns>Subsystem instance, or null if creation fails</returns>
        ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger);
    }
}
