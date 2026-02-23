using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Factory that creates a device driver for a specific role.
    /// Register implementations with DeviceManager to support new device types
    /// without modifying core code.
    /// </summary>
    public interface IDriverFactory
    {
        /// <summary>
        /// The device role this factory handles (e.g. "display", "audio", "lighting", "shades").
        /// Case-insensitive matching.
        /// </summary>
        string Role { get; }

        /// <summary>
        /// Creates a device driver instance for the given assignment.
        /// </summary>
        /// <param name="driverKey">Unique key: "roomId:role"</param>
        /// <param name="profile">Device profile (may be null for protocol-only drivers)</param>
        /// <param name="assignment">Device assignment from room config</param>
        /// <param name="logger">Logger instance</param>
        /// <returns>Driver instance, or null if creation fails</returns>
        IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger);
    }
}
