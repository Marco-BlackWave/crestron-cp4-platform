using System;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;
using CrestronCP4.ProcessorSide.Devices;

namespace CrestronCP4.ProcessorSide.Subsystems
{
    /// <summary>
    /// HVAC subsystem: manages temperature display, setpoint control, and mode selection.
    /// Uses IHvacDriver for hardware communication (BACnet or Modbus).
    /// </summary>
    public sealed class HvacSubsystem : ISubsystem
    {
        private readonly IHvacDriver _hvac;
        private readonly ILogger _logger;
        private SignalRegistry _signals;
        private string _roomId;
        private int _joinOffset;
        private static readonly string[] Modes = { "off", "heat", "cool", "auto" };
        private int _modeIndex;
        private bool _disposed;

        public string Id => "hvac";

        public HvacSubsystem(IHvacDriver hvac, ILogger logger)
        {
            _hvac = hvac;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Initialize(SignalRegistry signals, string roomId, int joinOffset)
        {
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _roomId = roomId;
            _joinOffset = joinOffset;

            if (_hvac != null)
            {
                _hvac.FeedbackReceived += OnHvacFeedback;

                // Push initial values
                UpdateTempFeedback(_hvac.CurrentTemp);
                UpdateSetpointFeedback(_hvac.Setpoint);
                UpdateModeFeedback(_hvac.Mode);
            }

            _logger.Info("HVAC subsystem initialized for room " + roomId);
        }

        public void ProcessSignalChange(string signalKey, object value)
        {
            if (!TryParseJoinOffset(signalKey, out string type, out int offset)) return;

            if (type == "digital")
            {
                if (!(value is bool pressed) || !pressed) return;

                switch (offset)
                {
                    case JoinMap.Digital.HvacModeToggle:
                        CycleMode();
                        break;

                    case JoinMap.Digital.HvacOnOff:
                        ToggleOnOff();
                        break;
                }
            }
            else if (type == "analog")
            {
                if (offset == JoinMap.Analog.TempSetpointSet && value is ushort rawSetpoint)
                {
                    // Convert 0-65535 to temperature in tenths of degree
                    // Scale: 0 = 60.0°F (600), 65535 = 90.0°F (900)
                    int temp = 600 + (rawSetpoint * 300 / 65535);
                    _hvac?.SetSetpoint(temp);
                    UpdateSetpointFeedback(temp);
                }
            }
        }

        private void CycleMode()
        {
            _modeIndex = (_modeIndex + 1) % Modes.Length;
            var newMode = Modes[_modeIndex];
            _hvac?.SetMode(newMode);
            UpdateModeFeedback(newMode);
        }

        private void ToggleOnOff()
        {
            if (_hvac == null) return;

            if (string.Equals(_hvac.Mode, "off", StringComparison.OrdinalIgnoreCase))
            {
                _hvac.SetMode("auto");
                _modeIndex = 3;
                UpdateModeFeedback("auto");
            }
            else
            {
                _hvac.SetMode("off");
                _modeIndex = 0;
                UpdateModeFeedback("off");
            }
        }

        private void UpdateTempFeedback(int temp)
        {
            var signal = _signals.GetOrCreate(MakeKey("analog", JoinMap.Analog.TempCurrent));
            // Scale temperature to 0-65535 range
            int scaled = (temp - 600) * 65535 / 300;
            signal?.Set((ushort)Math.Max(0, Math.Min(65535, scaled)));
        }

        private void UpdateSetpointFeedback(int temp)
        {
            var signal = _signals.GetOrCreate(MakeKey("analog", JoinMap.Analog.TempSetpointFeedback));
            int scaled = (temp - 600) * 65535 / 300;
            signal?.Set((ushort)Math.Max(0, Math.Min(65535, scaled)));
        }

        private void UpdateModeFeedback(string mode)
        {
            var signal = _signals.GetOrCreate(MakeKey("serial", JoinMap.Serial.HvacMode));
            signal?.Set(mode ?? "off");

            // Update mode index
            for (int i = 0; i < Modes.Length; i++)
            {
                if (string.Equals(Modes[i], mode, StringComparison.OrdinalIgnoreCase))
                {
                    _modeIndex = i;
                    break;
                }
            }
        }

        private void OnHvacFeedback(object sender, DeviceFeedbackEventArgs e)
        {
            switch (e.Property)
            {
                case "currentTemp":
                    if (e.Value is int temp) UpdateTempFeedback(temp);
                    break;
                case "setpoint":
                    if (e.Value is int sp) UpdateSetpointFeedback(sp);
                    break;
                case "mode":
                    if (e.Value is string mode) UpdateModeFeedback(mode);
                    break;
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
            if (_hvac != null) _hvac.FeedbackReceived -= OnHvacFeedback;
        }
    }
}
