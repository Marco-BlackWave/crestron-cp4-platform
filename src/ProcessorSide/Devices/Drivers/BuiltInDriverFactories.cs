using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Devices.Drivers
{
    public sealed class DisplayDriverFactory : IDriverFactory
    {
        public string Role => "display";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new ProfileDrivenDisplay(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class AudioDriverFactory : IDriverFactory
    {
        public string Role => "audio";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new ProfileDrivenAudio(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class LightingDriverFactory : IDriverFactory
    {
        public string Role => "lighting";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new LutronLighting(driverKey, logger);
        }
    }

    public sealed class ShadeDriverFactory : IDriverFactory
    {
        public string Role => "shades";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new GenericShade(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class SecurityDriverFactory : IDriverFactory
    {
        public string Role => "security";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new DscIt100Driver(driverKey, logger);
        }
    }

    public sealed class BacnetHvacDriverFactory : IDriverFactory
    {
        public string Role => "hvac";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            if (string.Equals(assignment.Protocol, "bacnet", System.StringComparison.OrdinalIgnoreCase))
            {
                return new BacnetHvac(driverKey, assignment.ObjectId, logger);
            }
            if (string.Equals(assignment.Protocol, "modbus", System.StringComparison.OrdinalIgnoreCase))
            {
                return new ModbusHvac(driverKey, logger);
            }
            logger.Warn("No HVAC driver for protocol: " + assignment.Protocol);
            return null;
        }
    }

    public sealed class MatrixDriverFactory : IDriverFactory
    {
        public string Role => "matrix";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new ProfileDrivenMatrix(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class SwitcherDriverFactory : IDriverFactory
    {
        public string Role => "switcher";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new ProfileDrivenMatrix(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class ProjectorDriverFactory : IDriverFactory
    {
        public string Role => "projector";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new ProfileDrivenProjector(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class DspDriverFactory : IDriverFactory
    {
        public string Role => "dsp";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            // Use dedicated BSS driver for Soundweb protocol
            if (profile != null && profile.Id != null &&
                profile.Id.IndexOf("bss", System.StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return new BssSoundwebDriver(driverKey, logger);
            }
            return new ProfileDrivenDsp(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class MixerDriverFactory : IDriverFactory
    {
        public string Role => "mixer";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new ProfileDrivenDsp(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class MediaDriverFactory : IDriverFactory
    {
        public string Role => "media";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new ProfileDrivenMedia(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class StreamingDriverFactory : IDriverFactory
    {
        public string Role => "streaming";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new ProfileDrivenMedia(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class SourceDriverFactory : IDriverFactory
    {
        public string Role => "source";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            return new ProfileDrivenMedia(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class GatewayDriverFactory : IDriverFactory
    {
        public string Role => "gateway";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            // Use dedicated Shelly driver for Shelly devices
            if (profile != null && profile.Id != null &&
                profile.Id.IndexOf("shelly", System.StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return new ShellyDriver(driverKey, assignment.Address, logger);
            }
            return new ProfileDrivenGateway(driverKey, profile, assignment.Protocol, logger);
        }
    }

    public sealed class SmartHomeDriverFactory : IDriverFactory
    {
        public string Role => "smart-home";

        public IDeviceDriver Create(string driverKey, DeviceProfile profile, DeviceAssignment assignment, ILogger logger)
        {
            if (profile != null && profile.Id != null &&
                profile.Id.IndexOf("shelly", System.StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return new ShellyDriver(driverKey, assignment.Address, logger);
            }
            return new ProfileDrivenGateway(driverKey, profile, assignment.Protocol, logger);
        }
    }
}
