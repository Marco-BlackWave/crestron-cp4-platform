using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;
using CrestronCP4.ProcessorSide.Devices;
using CrestronCP4.ProcessorSide.Subsystems;

namespace CrestronCP4.ProcessorSide.Core
{
    /// <summary>
    /// Top-level system orchestrator. Owns all RoomControllers, DeviceManager,
    /// and SceneEngine. Manages system-wide signals and routes signal changes
    /// to the appropriate room based on join offset ranges.
    /// </summary>
    public sealed class SystemEngine : IDisposable
    {
        private readonly SystemConfig _config;
        private readonly DeviceManager _deviceManager;
        private readonly SubsystemFactory _subsystemFactory;
        private readonly ILogger _logger;
        private readonly SignalRegistry _signals;
        private readonly Dictionary<string, RoomController> _rooms = new Dictionary<string, RoomController>(StringComparer.OrdinalIgnoreCase);
        private SceneEngine _sceneEngine;
        private bool _started;
        private bool _disposed;

        public SignalRegistry Signals => _signals;

        public SystemEngine(SystemConfig config, DeviceManager deviceManager, SubsystemFactory subsystemFactory, SignalRegistry signals, ILogger logger)
        {
            _config = config ?? throw new ArgumentNullException(nameof(config));
            _deviceManager = deviceManager ?? throw new ArgumentNullException(nameof(deviceManager));
            _subsystemFactory = subsystemFactory ?? throw new ArgumentNullException(nameof(subsystemFactory));
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Initialize()
        {
            _logger.Info("SystemEngine initializing: " + (_config.System?.Name ?? "unnamed"));

            // Initialize devices for each room
            if (_config.Rooms != null)
            {
                foreach (var roomConfig in _config.Rooms)
                {
                    try
                    {
                        _deviceManager.InitializeRoom(roomConfig);

                        var room = new RoomController(roomConfig, _subsystemFactory, _logger);
                        room.Initialize(_signals);
                        _rooms[roomConfig.Id] = room;
                    }
                    catch (Exception ex)
                    {
                        _logger.Error("Failed to initialize room " + roomConfig.Id + ": " + ex.Message);
                    }
                }
            }

            // Initialize scene engine
            _sceneEngine = new SceneEngine(_config.Scenes, _rooms, _signals, _logger);

            // Set system status
            var statusSignal = _signals.GetOrCreate("serial:" + JoinMap.SystemOffset + ":" + JoinMap.SystemSerial.SystemStatus);
            statusSignal?.Set("System Online");

            _logger.Info("SystemEngine initialized with " + _rooms.Count + " rooms");
        }

        public void Start()
        {
            _started = true;
            _logger.Info("SystemEngine started");
        }

        /// <summary>
        /// Routes a signal change to the appropriate room controller based on
        /// the signal key prefix (which encodes room ID).
        /// </summary>
        public void ProcessSignalChange(string signalKey, object value)
        {
            if (!_started || signalKey == null) return;

            // Route to appropriate room
            foreach (var room in _rooms.Values)
            {
                try
                {
                    room.ProcessSignalChange(signalKey, value);
                }
                catch (Exception ex)
                {
                    _logger.Error("Signal routing error for " + signalKey + ": " + ex.Message);
                }
            }

            // Check system-level signals
            _sceneEngine?.ProcessSignalChange(signalKey, value);
        }

        public RoomController GetRoom(string roomId)
        {
            _rooms.TryGetValue(roomId, out var room);
            return room;
        }

        public SceneEngine SceneEngine => _sceneEngine;

        public void Stop()
        {
            _started = false;
            var statusSignal = _signals.GetOrCreate("serial:" + JoinMap.SystemOffset + ":" + JoinMap.SystemSerial.SystemStatus);
            statusSignal?.Set("System Offline");
            _logger.Info("SystemEngine stopped");
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            Stop();

            foreach (var room in _rooms.Values)
            {
                try { room.Dispose(); } catch { }
            }
            _rooms.Clear();

            try { _deviceManager.Dispose(); } catch { }

            _signals.ClearAll();
        }
    }
}
