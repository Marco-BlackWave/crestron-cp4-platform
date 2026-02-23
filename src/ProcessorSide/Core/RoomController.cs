using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;
using CrestronCP4.ProcessorSide.Subsystems;

namespace CrestronCP4.ProcessorSide.Core
{
    /// <summary>
    /// Controls a single room. Owns subsystems and delegates signal changes to the correct one.
    /// Each room has a joinOffset that determines its absolute join number range.
    /// </summary>
    public sealed class RoomController : IDisposable
    {
        private readonly RoomConfig _config;
        private readonly SubsystemFactory _subsystemFactory;
        private readonly ILogger _logger;
        private readonly Dictionary<string, ISubsystem> _subsystems = new Dictionary<string, ISubsystem>(StringComparer.OrdinalIgnoreCase);
        private SignalRegistry _signals;
        private bool _disposed;

        public string RoomId => _config.Id;
        public string RoomName => _config.Name;
        public int JoinOffset => _config.JoinOffset;

        public RoomController(RoomConfig config, SubsystemFactory subsystemFactory, ILogger logger)
        {
            _config = config ?? throw new ArgumentNullException(nameof(config));
            _subsystemFactory = subsystemFactory ?? throw new ArgumentNullException(nameof(subsystemFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Initialize(SignalRegistry signals)
        {
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));

            if (_config.Subsystems == null) return;

            foreach (var subsystemName in _config.Subsystems)
            {
                try
                {
                    var subsystem = _subsystemFactory.Create(subsystemName, _config);
                    if (subsystem != null)
                    {
                        subsystem.Initialize(signals, _config.Id, _config.JoinOffset);
                        _subsystems[subsystem.Id] = subsystem;
                    }
                }
                catch (Exception ex)
                {
                    _logger.Error("Failed to initialize subsystem " + subsystemName + " in room " + _config.Id + ": " + ex.Message);
                }
            }

            // Set room name on serial join
            var roomNameSignal = signals.GetOrCreate("serial:" + _config.Id + ":" + JoinMap.Serial.RoomName);
            roomNameSignal?.Set(_config.Name);

            _logger.Info("Room " + _config.Id + " initialized with " + _subsystems.Count + " subsystems");
        }

        /// <summary>
        /// Routes a signal change to the appropriate subsystem.
        /// Called by the SystemEngine when a signal within this room's range changes.
        /// </summary>
        public void ProcessSignalChange(string signalKey, object value)
        {
            foreach (var subsystem in _subsystems.Values)
            {
                try
                {
                    subsystem.ProcessSignalChange(signalKey, value);
                }
                catch (Exception ex)
                {
                    _logger.Error("Subsystem " + subsystem.Id + " error in room " + _config.Id + ": " + ex.Message);
                }
            }
        }

        /// <summary>
        /// Sets lighting level for this room (used by SceneEngine).
        /// </summary>
        public void SetLightingLevel(int percent)
        {
            if (_subsystems.TryGetValue("lighting", out var sub) && sub is LightingSubsystem lighting)
            {
                lighting.SetLevel(percent);
            }
        }

        /// <summary>
        /// Controls shades for this room (used by SceneEngine).
        /// </summary>
        public void SetShadeState(string state)
        {
            if (_subsystems.TryGetValue("shades", out var sub) && sub is ShadeSubsystem shade)
            {
                if (string.Equals(state, "closed", StringComparison.OrdinalIgnoreCase))
                {
                    shade.ProcessSignalChange("digital:" + _config.Id + ":" + JoinMap.Digital.ShadeClose, true);
                }
                else if (string.Equals(state, "open", StringComparison.OrdinalIgnoreCase))
                {
                    shade.ProcessSignalChange("digital:" + _config.Id + ":" + JoinMap.Digital.ShadeOpen, true);
                }
            }
        }

        /// <summary>
        /// Arms or changes security mode for this room (used by SceneEngine).
        /// </summary>
        public void ArmSecurity(string mode)
        {
            if (_subsystems.TryGetValue("security", out var sub) && sub is SecuritySubsystem security)
            {
                security.SetArmMode(mode);
            }
        }

        /// <summary>
        /// Powers off AV for this room (used by SceneEngine).
        /// </summary>
        public void PowerOffAv()
        {
            if (_subsystems.TryGetValue("av", out var sub) && sub is AvSubsystem av)
            {
                av.ProcessSignalChange("digital:" + _config.Id + ":" + JoinMap.Digital.PowerToggle, true);
            }
        }

        public ISubsystem GetSubsystem(string id)
        {
            _subsystems.TryGetValue(id, out var sub);
            return sub;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;

            foreach (var subsystem in _subsystems.Values)
            {
                try { subsystem.Dispose(); } catch { }
            }
            _subsystems.Clear();
        }
    }
}
