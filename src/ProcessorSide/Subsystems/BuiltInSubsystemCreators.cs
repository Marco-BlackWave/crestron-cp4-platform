using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Devices;

namespace CrestronCP4.ProcessorSide.Subsystems
{
    public sealed class AvSubsystemCreator : ISubsystemCreator
    {
        public string SubsystemType => "av";

        public ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger)
        {
            var displays = deviceManager.GetDrivers<IDisplayDriver>(room.Id, "display");
            var audios = deviceManager.GetDrivers<IAudioDriver>(room.Id, "audio");
            var sourceNames = room.Sources != null ? new List<string>(room.Sources) : new List<string>();
            return new AvSubsystem(displays, audios, sourceNames, logger);
        }
    }

    public sealed class LightingSubsystemCreator : ISubsystemCreator
    {
        public string SubsystemType => "lighting";

        public ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger)
        {
            var drivers = deviceManager.GetDrivers<ILightingDriver>(room.Id, "lighting");
            return new LightingSubsystem(drivers, logger);
        }
    }

    public sealed class ShadeSubsystemCreator : ISubsystemCreator
    {
        public string SubsystemType => "shades";

        public ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger)
        {
            var drivers = deviceManager.GetDrivers<IShadeDriver>(room.Id, "shades");
            return new ShadeSubsystem(drivers, logger);
        }
    }

    public sealed class HvacSubsystemCreator : ISubsystemCreator
    {
        public string SubsystemType => "hvac";

        public ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger)
        {
            var drivers = deviceManager.GetDrivers<IHvacDriver>(room.Id, "hvac");
            return new HvacSubsystem(drivers, logger);
        }
    }

    public sealed class SecuritySubsystemCreator : ISubsystemCreator
    {
        public string SubsystemType => "security";

        public ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger)
        {
            var drivers = deviceManager.GetDrivers<ISecurityDriver>(room.Id, "security");
            return new SecuritySubsystem(drivers, logger);
        }
    }
}
