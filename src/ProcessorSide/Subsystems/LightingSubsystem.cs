using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;
using CrestronCP4.ProcessorSide.Devices;

namespace CrestronCP4.ProcessorSide.Subsystems
{
    /// <summary>
    /// Lighting subsystem: manages light levels and scene recalls per room.
    /// Uses ILightingDriver for hardware communication.
    /// </summary>
    public sealed class LightingSubsystem : ISubsystem
    {
        private readonly List<ILightingDriver> _drivers;
        private readonly ILogger _logger;
        private SignalRegistry _signals;
        private string _roomId;
        private int _joinOffset;
        private int _activeScene = -1;
        private bool _disposed;

        // Primary driver for feedback
        private ILightingDriver _lighting => _drivers.Count > 0 ? _drivers[0] : null;

        public string Id => "lighting";

        public LightingSubsystem(List<ILightingDriver> drivers, ILogger logger)
        {
            _drivers = drivers ?? new List<ILightingDriver>();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public LightingSubsystem(ILightingDriver lighting, ILogger logger)
            : this(lighting != null ? new List<ILightingDriver> { lighting } : new List<ILightingDriver>(), logger)
        { }

        public void Initialize(SignalRegistry signals, string roomId, int joinOffset)
        {
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _roomId = roomId;
            _joinOffset = joinOffset;

            foreach (var drv in _drivers)
            {
                drv.FeedbackReceived += OnLightingFeedback;
            }

            _logger.Info("Lighting subsystem initialized for room " + roomId);
        }

        public void ProcessSignalChange(string signalKey, object value)
        {
            if (!TryParseJoinOffset(signalKey, out string type, out int offset)) return;

            if (type == "digital")
            {
                // Scene recalls: offsets 20-23
                if (offset >= JoinMap.Digital.LightingScene1 && offset <= JoinMap.Digital.LightingScene4)
                {
                    if (value is bool pressed && pressed)
                    {
                        int sceneIndex = offset - JoinMap.Digital.LightingScene1;
                        RecallScene(sceneIndex);
                    }
                }
            }
            else if (type == "analog")
            {
                // Direct level control: offset 3
                if (offset == JoinMap.Analog.LightingSet)
                {
                    if (value is ushort level)
                    {
                        int percent = level * 100 / 65535;
                        SetLevel(percent);
                    }
                }
            }
        }

        public void SetLevel(int percent)
        {
            percent = Math.Max(0, Math.Min(100, percent));
            foreach (var drv in _drivers)
            {
                try { drv.SetLevel(_roomId, percent); } catch { }
            }

            var fbSignal = _signals.GetOrCreate(MakeKey("analog", JoinMap.Analog.LightingLevelFeedback));
            fbSignal?.Set((ushort)(percent * 655));
        }

        private void RecallScene(int sceneIndex)
        {
            _activeScene = sceneIndex;
            var sceneId = _roomId + ":scene" + (sceneIndex + 1);
            foreach (var drv in _drivers)
            {
                try { drv.RecallScene(sceneId); } catch { }
            }

            // Update scene feedback
            for (int i = 0; i < 4; i++)
            {
                var fbSignal = _signals.GetOrCreate(MakeKey("digital", JoinMap.Digital.LightingSceneFb1 + i));
                fbSignal?.Set(i == sceneIndex);
            }

            _logger.Info("Room " + _roomId + ": lighting scene " + (sceneIndex + 1) + " recalled");
        }

        private void OnLightingFeedback(object sender, DeviceFeedbackEventArgs e)
        {
            if (e.Property != null && e.Property.StartsWith("level:", StringComparison.OrdinalIgnoreCase))
            {
                if (e.Value is int level)
                {
                    var fbSignal = _signals.GetOrCreate(MakeKey("analog", JoinMap.Analog.LightingLevelFeedback));
                    fbSignal?.Set((ushort)(level * 655));
                }
            }
        }

        private bool TryParseJoinOffset(string signalKey, out string type, out int offset)
        {
            type = null;
            offset = -1;
            if (signalKey == null) return false;

            // Try digital and analog prefixes
            foreach (var t in new[] { "digital", "analog" })
            {
                var prefix = t + ":" + _roomId + ":";
                if (signalKey.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    type = t;
                    return int.TryParse(signalKey.Substring(prefix.Length), out offset);
                }
            }
            return false;
        }

        private string MakeKey(string joinType, int offset)
        {
            return joinType + ":" + _roomId + ":" + offset;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            foreach (var drv in _drivers) drv.FeedbackReceived -= OnLightingFeedback;
        }
    }
}
