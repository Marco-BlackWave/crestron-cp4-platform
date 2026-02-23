using System;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;
using CrestronCP4.ProcessorSide.Devices;

namespace CrestronCP4.ProcessorSide.Subsystems
{
    /// <summary>
    /// Security subsystem: manages arm/disarm, zone status, and alarm state.
    /// Uses ISecurityDriver for hardware communication (DSC IT-100, Elk M1, etc.).
    /// </summary>
    public sealed class SecuritySubsystem : ISubsystem
    {
        private readonly ISecurityDriver _security;
        private readonly ILogger _logger;
        private SignalRegistry _signals;
        private string _roomId;
        private int _joinOffset;
        private bool _disposed;

        public string Id => "security";

        public SecuritySubsystem(ISecurityDriver security, ILogger logger)
        {
            _security = security;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Initialize(SignalRegistry signals, string roomId, int joinOffset)
        {
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _roomId = roomId;
            _joinOffset = joinOffset;

            if (_security != null)
            {
                _security.FeedbackReceived += OnSecurityFeedback;

                // Push initial state
                UpdateArmModeFeedback(_security.ArmMode);
                UpdateAlarmFeedback(_security.IsAlarmActive);
                UpdateReadyFeedback(_security.IsReady);
                UpdateTroubleFeedback(_security.IsTrouble);
                UpdateZoneFeedback();
            }

            _logger.Info("Security subsystem initialized for room " + roomId);
        }

        public void ProcessSignalChange(string signalKey, object value)
        {
            if (!TryParseJoinOffset(signalKey, out string type, out int offset)) return;

            if (type == "digital")
            {
                if (!(value is bool pressed) || !pressed) return;

                switch (offset)
                {
                    case JoinMap.Digital.SecurityArmAway:
                        _security?.ArmAway();
                        break;

                    case JoinMap.Digital.SecurityArmStay:
                        _security?.ArmStay();
                        break;

                    case JoinMap.Digital.SecurityArmNight:
                        _security?.ArmNight();
                        break;

                    case JoinMap.Digital.SecurityDisarm:
                        HandleDisarm();
                        break;

                    case JoinMap.Digital.SecurityPanic:
                        _security?.Panic();
                        break;

                    case JoinMap.Digital.SecurityStatusRequest:
                        _security?.StatusRequest();
                        break;
                }
            }
            else if (type == "serial")
            {
                if (offset == JoinMap.Serial.SecurityDisarmCode && value is string code)
                {
                    // Store code — actual disarm triggered by digital join
                    var codeSignal = _signals.GetOrCreate(MakeKey("serial", JoinMap.Serial.SecurityDisarmCode));
                    codeSignal?.Set(code);
                }
            }
        }

        /// <summary>
        /// Sets the arm mode programmatically (used by SceneEngine).
        /// </summary>
        public void SetArmMode(string mode)
        {
            if (_security == null) return;

            switch ((mode ?? "").ToLowerInvariant())
            {
                case "away":
                    _security.ArmAway();
                    break;
                case "stay":
                    _security.ArmStay();
                    break;
                case "night":
                    _security.ArmNight();
                    break;
                case "disarm":
                case "off":
                    // Disarm via scene requires no code — panel must be configured to allow
                    _logger.Warn("Scene-triggered disarm not supported without code");
                    break;
            }
        }

        private void HandleDisarm()
        {
            // Read the disarm code from the serial signal
            var codeSignal = _signals.GetOrCreate(MakeKey("serial", JoinMap.Serial.SecurityDisarmCode));
            var code = codeSignal?.Get() as string;
            if (!string.IsNullOrEmpty(code))
            {
                _security?.Disarm(code);
            }
            else
            {
                _logger.Warn("Disarm requested but no code provided for room " + _roomId);
            }
        }

        private void OnSecurityFeedback(object sender, DeviceFeedbackEventArgs e)
        {
            switch (e.Property)
            {
                case "armMode":
                    if (e.Value is string mode) UpdateArmModeFeedback(mode);
                    break;
                case "alarm":
                    if (e.Value is bool alarm) UpdateAlarmFeedback(alarm);
                    break;
                case "ready":
                    if (e.Value is bool ready) UpdateReadyFeedback(ready);
                    break;
                case "trouble":
                    if (e.Value is bool trouble) UpdateTroubleFeedback(trouble);
                    break;
                default:
                    // Zone feedback: "zone1" through "zone8"
                    if (e.Property != null && e.Property.StartsWith("zone", StringComparison.OrdinalIgnoreCase)
                        && e.Value is bool zoneOpen)
                    {
                        if (int.TryParse(e.Property.Substring(4), out int zoneNum) && zoneNum >= 1 && zoneNum <= 8)
                        {
                            UpdateSingleZoneFeedback(zoneNum, zoneOpen);
                        }
                    }
                    break;
            }
        }

        private void UpdateArmModeFeedback(string mode)
        {
            mode = mode ?? "Disarmed";

            // Serial feedback
            var modeSignal = _signals.GetOrCreate(MakeKey("serial", JoinMap.Serial.SecurityArmMode));
            modeSignal?.Set(mode);

            // Status text
            string status = mode == "Disarmed" ? (_security != null && _security.IsReady ? "Ready" : "Not Ready") : mode;
            var statusSignal = _signals.GetOrCreate(MakeKey("serial", JoinMap.Serial.SecurityStatus));
            statusSignal?.Set(status);

            // Digital feedback for each arm mode
            SetDigitalSignal(JoinMap.Digital.SecurityArmedAwayFb,
                string.Equals(mode, "Armed Away", StringComparison.OrdinalIgnoreCase));
            SetDigitalSignal(JoinMap.Digital.SecurityArmedStayFb,
                string.Equals(mode, "Armed Stay", StringComparison.OrdinalIgnoreCase));
            SetDigitalSignal(JoinMap.Digital.SecurityArmedNightFb,
                string.Equals(mode, "Armed Night", StringComparison.OrdinalIgnoreCase));
            SetDigitalSignal(JoinMap.Digital.SecurityDisarmedFb,
                string.Equals(mode, "Disarmed", StringComparison.OrdinalIgnoreCase));
        }

        private void UpdateAlarmFeedback(bool active)
        {
            SetDigitalSignal(JoinMap.Digital.SecurityAlarmActiveFb, active);
            if (active)
            {
                var statusSignal = _signals.GetOrCreate(MakeKey("serial", JoinMap.Serial.SecurityStatus));
                statusSignal?.Set("Alarm!");
            }
        }

        private void UpdateReadyFeedback(bool ready)
        {
            SetDigitalSignal(JoinMap.Digital.SecurityReadyFb, ready);
        }

        private void UpdateTroubleFeedback(bool trouble)
        {
            SetDigitalSignal(JoinMap.Digital.SecurityTroubleFb, trouble);
        }

        private void UpdateZoneFeedback()
        {
            if (_security == null) return;
            for (int i = 1; i <= Math.Min(8, _security.ZoneCount); i++)
            {
                UpdateSingleZoneFeedback(i, _security.IsZoneOpen(i));
            }
        }

        private void UpdateSingleZoneFeedback(int zone, bool open)
        {
            if (zone < 1 || zone > 8) return;
            int offset = JoinMap.Digital.SecurityZone1Fb + (zone - 1);
            SetDigitalSignal(offset, open);
        }

        private void SetDigitalSignal(int offset, bool value)
        {
            var signal = _signals.GetOrCreate(MakeKey("digital", offset));
            signal?.Set(value);
        }

        private bool TryParseJoinOffset(string signalKey, out string type, out int offset)
        {
            type = null;
            offset = -1;
            if (signalKey == null) return false;

            foreach (var t in new[] { "digital", "serial" })
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
            if (_security != null) _security.FeedbackReceived -= OnSecurityFeedback;
        }
    }
}
