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
            var display = deviceManager.GetDriver<IDisplayDriver>(room.Id, "display");
            var audio = deviceManager.GetDriver<IAudioDriver>(room.Id, "audio");
            var sourceNames = room.Sources != null ? new List<string>(room.Sources) : new List<string>();
            return new AvSubsystem(display, audio, sourceNames, logger);
        }
    }

    public sealed class LightingSubsystemCreator : ISubsystemCreator
    {
        public string SubsystemType => "lighting";

        public ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger)
        {
            var lighting = deviceManager.GetDriver<ILightingDriver>(room.Id, "lighting");
            return new LightingSubsystem(lighting, logger);
        }
    }

    public sealed class ShadeSubsystemCreator : ISubsystemCreator
    {
        public string SubsystemType => "shades";

        public ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger)
        {
            var shade = deviceManager.GetDriver<IShadeDriver>(room.Id, "shades");
            return new ShadeSubsystem(shade, logger);
        }
    }

    public sealed class HvacSubsystemCreator : ISubsystemCreator
    {
        public string SubsystemType => "hvac";

        public ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger)
        {
            var hvac = deviceManager.GetDriver<IHvacDriver>(room.Id, "hvac");
            return new HvacSubsystem(hvac, logger);
        }
    }

    public sealed class SecuritySubsystemCreator : ISubsystemCreator
    {
        public string SubsystemType => "security";

        public ISubsystem Create(RoomConfig room, DeviceManager deviceManager, ILogger logger)
        {
            var security = deviceManager.GetDriver<ISecurityDriver>(room.Id, "security");
            return new SecuritySubsystem(security, logger);
        }
    }
}
