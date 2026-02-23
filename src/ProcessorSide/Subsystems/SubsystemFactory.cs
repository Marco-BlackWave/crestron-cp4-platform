using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Devices;

namespace CrestronCP4.ProcessorSide.Subsystems
{
    /// <summary>
    /// Creates subsystem instances from configuration.
    /// Uses a registry of ISubsystemCreator instances — register new creators to support
    /// new subsystem types without modifying this class.
    /// </summary>
    public sealed class SubsystemFactory
    {
        private readonly DeviceManager _deviceManager;
        private readonly ILogger _logger;
        private readonly Dictionary<string, ISubsystemCreator> _creators = new Dictionary<string, ISubsystemCreator>(StringComparer.OrdinalIgnoreCase);

        public SubsystemFactory(DeviceManager deviceManager, ILogger logger)
        {
            _deviceManager = deviceManager ?? throw new ArgumentNullException(nameof(deviceManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            RegisterBuiltInCreators();
        }

        /// <summary>
        /// Register a subsystem creator for a subsystem type.
        /// Call this before room initialization to add support for custom subsystem types.
        /// </summary>
        public void RegisterCreator(ISubsystemCreator creator)
        {
            if (creator == null) throw new ArgumentNullException(nameof(creator));
            _creators[creator.SubsystemType] = creator;
            _logger.Info("Registered subsystem creator for type: " + creator.SubsystemType);
        }

        private void RegisterBuiltInCreators()
        {
            _creators["av"] = new AvSubsystemCreator();
            _creators["lighting"] = new LightingSubsystemCreator();
            _creators["shades"] = new ShadeSubsystemCreator();
            _creators["hvac"] = new HvacSubsystemCreator();
            _creators["security"] = new SecuritySubsystemCreator();
        }

        public ISubsystem Create(string subsystemName, RoomConfig room)
        {
            if (string.IsNullOrWhiteSpace(subsystemName))
            {
                throw new ArgumentException("Subsystem name is required.");
            }

            if (_creators.TryGetValue(subsystemName, out var creator))
            {
                return creator.Create(room, _deviceManager, _logger);
            }

            _logger.Warn("No subsystem creator registered for type: " + subsystemName);
            return null;
        }
    }
}
