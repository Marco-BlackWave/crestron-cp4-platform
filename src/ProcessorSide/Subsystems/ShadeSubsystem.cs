using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;
using CrestronCP4.ProcessorSide.Devices;

namespace CrestronCP4.ProcessorSide.Subsystems
{
    /// <summary>
    /// Shade subsystem: manages open/close/stop/position per room.
    /// Uses IShadeDriver for hardware communication.
    /// </summary>
    public sealed class ShadeSubsystem : ISubsystem
    {
        private readonly List<IShadeDriver> _drivers;
        private readonly ILogger _logger;
        private SignalRegistry _signals;
        private string _roomId;
        private int _joinOffset;
        private bool _disposed;

        private IShadeDriver _shade => _drivers.Count > 0 ? _drivers[0] : null;

        public string Id => "shades";

        public ShadeSubsystem(List<IShadeDriver> drivers, ILogger logger)
        {
            _drivers = drivers ?? new List<IShadeDriver>();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public ShadeSubsystem(IShadeDriver shade, ILogger logger)
            : this(shade != null ? new List<IShadeDriver> { shade } : new List<IShadeDriver>(), logger)
        { }

        public void Initialize(SignalRegistry signals, string roomId, int joinOffset)
        {
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _roomId = roomId;
            _joinOffset = joinOffset;

            foreach (var drv in _drivers)
            {
                drv.FeedbackReceived += OnShadeFeedback;
            }

            _logger.Info("Shade subsystem initialized for room " + roomId);
        }

        public void ProcessSignalChange(string signalKey, object value)
        {
            if (!TryParseJoinOffset(signalKey, out string type, out int offset)) return;

            if (type == "digital")
            {
                if (!(value is bool pressed) || !pressed) return;

                switch (offset)
                {
                    case JoinMap.Digital.ShadeOpen:
                        foreach (var d in _drivers) { try { d.Open(_roomId); } catch { } }
                        UpdatePositionFeedback(100);
                        break;

                    case JoinMap.Digital.ShadeClose:
                        foreach (var d in _drivers) { try { d.Close(_roomId); } catch { } }
                        UpdatePositionFeedback(0);
                        break;

                    case JoinMap.Digital.ShadeStop:
                        foreach (var d in _drivers) { try { d.Stop(_roomId); } catch { } }
                        break;
                }
            }
            else if (type == "analog")
            {
                if (offset == JoinMap.Analog.ShadeSet && value is ushort level)
                {
                    int percent = level * 100 / 65535;
                    foreach (var d in _drivers) { try { d.SetPosition(_roomId, percent); } catch { } }
                    UpdatePositionFeedback(percent);
                }
            }
        }

        private void UpdatePositionFeedback(int percent)
        {
            var fbSignal = _signals.GetOrCreate(MakeKey("analog", JoinMap.Analog.ShadePositionFeedback));
            fbSignal?.Set((ushort)(percent * 655));
        }

        private void OnShadeFeedback(object sender, DeviceFeedbackEventArgs e)
        {
            if (e.Property != null && e.Property.StartsWith("position:", StringComparison.OrdinalIgnoreCase) && e.Value is int pos)
            {
                UpdatePositionFeedback(pos);
            }
        }

        private bool TryParseJoinOffset(string signalKey, out string type, out int offset)
        {
            type = null;
            offset = -1;
            if (signalKey == null) return false;

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
            foreach (var drv in _drivers) drv.FeedbackReceived -= OnShadeFeedback;
        }
    }
}
