using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Bindings
{
    /// <summary>
    /// Software-only join bridge harness used to validate panel join activity
    /// against SignalRegistry and SystemEngine routing logic without hardware.
    /// </summary>
    public sealed class XPanelJoinHarness
    {
        private readonly SignalRegistry _signals;
        private readonly SystemEngine _systemEngine;
        private readonly ILogger _logger;
        private readonly object _sync = new object();

        public XPanelJoinHarness(SignalRegistry signals, SystemEngine systemEngine, ILogger logger)
        {
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _systemEngine = systemEngine ?? throw new ArgumentNullException(nameof(systemEngine));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void PushDigital(int join, bool value)
        {
            PushSignal(BuildJoinKey("digital", join), value);
        }

        public void PushAnalog(int join, ushort value)
        {
            PushSignal(BuildJoinKey("analog", join), value);
        }

        public void PushSerial(int join, string value)
        {
            PushSignal(BuildJoinKey("serial", join), value ?? string.Empty);
        }

        public void PushSignal(string signalKey, object value)
        {
            if (string.IsNullOrWhiteSpace(signalKey))
            {
                _logger.Warn("XPanelJoinHarness ignored empty signal key.");
                return;
            }

            lock (_sync)
            {
                try
                {
                    var signal = _signals.GetOrCreate(signalKey);
                    if (signal == null)
                    {
                        _logger.Warn("XPanelJoinHarness could not create signal: " + signalKey);
                        return;
                    }

                    signal.Set(value);
                    _systemEngine.ProcessSignalChange(signalKey, value);
                }
                catch (Exception ex)
                {
                    _logger.Error("XPanelJoinHarness push failed for " + signalKey + ": " + ex.Message);
                }
            }
        }

        public List<SignalSnapshotEntry> Snapshot()
        {
            var result = new List<SignalSnapshotEntry>();

            lock (_sync)
            {
                try
                {
                    foreach (var signal in _signals.All)
                    {
                        result.Add(new SignalSnapshotEntry(signal.Name, signal.Get()));
                    }
                }
                catch (Exception ex)
                {
                    _logger.Error("XPanelJoinHarness snapshot failed: " + ex.Message);
                }
            }

            return result;
        }

        public Dictionary<string, object> SnapshotMap()
        {
            var map = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            lock (_sync)
            {
                try
                {
                    foreach (var signal in _signals.All)
                    {
                        map[signal.Name] = signal.Get();
                    }
                }
                catch (Exception ex)
                {
                    _logger.Error("XPanelJoinHarness snapshot map failed: " + ex.Message);
                }
            }

            return map;
        }

        private static string BuildJoinKey(string joinType, int join)
        {
            if (join <= 0) throw new ArgumentOutOfRangeException(nameof(join), "Join must be > 0.");
            return joinType + ":" + join;
        }
    }

    public sealed class SignalSnapshotEntry
    {
        public SignalSnapshotEntry(string name, object value)
        {
            Name = name;
            Value = value;
        }

        public string Name { get; private set; }
        public object Value { get; private set; }
    }
}
