using System;
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
        private readonly IShadeDriver _shade;
        private readonly ILogger _logger;
        private SignalRegistry _signals;
        private string _roomId;
        private int _joinOffset;
        private bool _disposed;

        public string Id => "shades";

        public ShadeSubsystem(IShadeDriver shade, ILogger logger)
        {
            _shade = shade;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Initialize(SignalRegistry signals, string roomId, int joinOffset)
        {
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _roomId = roomId;
            _joinOffset = joinOffset;

            if (_shade != null)
            {
                _shade.FeedbackReceived += OnShadeFeedback;
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
                        _shade?.Open(_roomId);
                        UpdatePositionFeedback(100);
                        break;

                    case JoinMap.Digital.ShadeClose:
                        _shade?.Close(_roomId);
                        UpdatePositionFeedback(0);
                        break;

                    case JoinMap.Digital.ShadeStop:
                        _shade?.Stop(_roomId);
                        break;
                }
            }
            else if (type == "analog")
            {
                if (offset == JoinMap.Analog.ShadeSet && value is ushort level)
                {
                    int percent = level * 100 / 65535;
                    _shade?.SetPosition(_roomId, percent);
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
            if (_shade != null) _shade.FeedbackReceived -= OnShadeFeedback;
        }
    }
}
