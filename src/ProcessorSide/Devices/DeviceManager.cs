using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Devices.Drivers;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Devices
{
    /// <summary>
    /// Instantiates and manages all device drivers from configuration.
    /// Uses a registry of IDriverFactory instances — register new factories to support
    /// new device types without modifying this class.
    /// </summary>
    public sealed class DeviceManager : IDisposable
    {
        private readonly DeviceProfileLoader _profileLoader;
        private readonly TransportFactory _transportFactory;
        private readonly ILogger _logger;
        private readonly Dictionary<string, IDeviceDriver> _drivers = new Dictionary<string, IDeviceDriver>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, IDriverFactory> _factories = new Dictionary<string, IDriverFactory>(StringComparer.OrdinalIgnoreCase);
        private readonly List<ITransport> _transports = new List<ITransport>();
        private bool _disposed;

        public DeviceManager(DeviceProfileLoader profileLoader, TransportFactory transportFactory, ILogger logger)
        {
            _profileLoader = profileLoader ?? throw new ArgumentNullException(nameof(profileLoader));
            _transportFactory = transportFactory ?? throw new ArgumentNullException(nameof(transportFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            RegisterBuiltInFactories();
        }

        /// <summary>
        /// Register a driver factory for a device role.
        /// Call this before InitializeRoom to add support for custom device types.
        /// </summary>
        public void RegisterFactory(IDriverFactory factory)
        {
            if (factory == null) throw new ArgumentNullException(nameof(factory));
            _factories[factory.Role] = factory;
            _logger.Info("Registered driver factory for role: " + factory.Role);
        }

        private void RegisterBuiltInFactories()
        {
            _factories["display"] = new DisplayDriverFactory();
            _factories["audio"] = new AudioDriverFactory();
            _factories["lighting"] = new LightingDriverFactory();
            _factories["shades"] = new ShadeDriverFactory();
            _factories["hvac"] = new BacnetHvacDriverFactory();
            _factories["security"] = new SecurityDriverFactory();
            _factories["matrix"] = new MatrixDriverFactory();
            _factories["switcher"] = new SwitcherDriverFactory();
            _factories["projector"] = new ProjectorDriverFactory();
            _factories["dsp"] = new DspDriverFactory();
            _factories["mixer"] = new MixerDriverFactory();
            _factories["media"] = new MediaDriverFactory();
            _factories["streaming"] = new StreamingDriverFactory();
            _factories["source"] = new SourceDriverFactory();
            _factories["gateway"] = new GatewayDriverFactory();
            _factories["smart-home"] = new SmartHomeDriverFactory();
        }

        public void InitializeRoom(RoomConfig room)
        {
            if (room?.Devices == null) return;

            foreach (var kvp in room.Devices)
            {
                var role = kvp.Key;
                var assignment = kvp.Value;
                var driverKey = room.Id + ":" + role;

                try
                {
                    var driver = CreateDriver(driverKey, role, assignment);
                    if (driver != null)
                    {
                        var transport = _transportFactory.Create(driverKey, assignment);
                        _transports.Add(transport);
                        driver.Initialize(transport);
                        _drivers[driverKey] = driver;
                    }
                }
                catch (Exception ex)
                {
                    _logger.Error("Failed to initialize " + driverKey + ": " + ex.Message);
                }
            }
        }

        public T GetDriver<T>(string roomId, string role) where T : class, IDeviceDriver
        {
            var key = roomId + ":" + role;
            if (_drivers.TryGetValue(key, out var driver))
            {
                return driver as T;
            }
            return null;
        }

        public IDeviceDriver GetDriver(string roomId, string role)
        {
            var key = roomId + ":" + role;
            _drivers.TryGetValue(key, out var driver);
            return driver;
        }

        private IDeviceDriver CreateDriver(string driverKey, string role, DeviceAssignment assignment)
        {
            var profile = _profileLoader.GetProfile(assignment.ProfileId) ?? CreateFallbackProfile(assignment);

            if (_factories.TryGetValue(role, out var factory))
            {
                return factory.Create(driverKey, profile, assignment, _logger);
            }

            _logger.Warn("No driver factory registered for role: " + role);
            return null;
        }

        private static DeviceProfile CreateFallbackProfile(DeviceAssignment assignment)
        {
            return new DeviceProfile
            {
                Id = assignment.ProfileId ?? "unknown",
                Manufacturer = "Unknown",
                Model = "Generic",
                Category = "unknown",
                Protocols = new ProtocolSet(),
                Capabilities = new DeviceCapabilities()
            };
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;

            foreach (var driver in _drivers.Values)
            {
                try { driver.Dispose(); } catch { }
            }
            _drivers.Clear();

            foreach (var transport in _transports)
            {
                try { transport.Dispose(); } catch { }
            }
            _transports.Clear();
        }
    }
}
