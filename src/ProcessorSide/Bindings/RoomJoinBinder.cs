using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Bindings
{
    /// <summary>
    /// Binds room-level joins to signals using the standardized join map.
    /// Each room's joins are offset by its joinOffset from the configuration.
    /// Input joins (panel → program): subscribe to EISC SigChange, update signal, route to SystemEngine.
    /// Output joins (program → panel): subscribe to signal ValueChanged, push to EISC.
    /// </summary>
    public sealed class RoomJoinBinder
    {
        private readonly IJoinEndpoint _endpoint;
        private readonly SignalRegistry _signals;
        private readonly SystemEngine _systemEngine;
        private readonly ILogger _logger;
        private readonly List<Action> _unbindActions = new List<Action>();

        public RoomJoinBinder(IJoinEndpoint endpoint, SignalRegistry signals, SystemEngine systemEngine, ILogger logger)
        {
            _endpoint = endpoint ?? throw new ArgumentNullException(nameof(endpoint));
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _systemEngine = systemEngine ?? throw new ArgumentNullException(nameof(systemEngine));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void BindRoom(RoomConfig room)
        {
            if (room == null) return;

            int offset = room.JoinOffset;
            string roomId = room.Id;

            _logger.Info("Binding room " + roomId + " at offset " + offset);

            // Digital input joins (panel → program)
            BindDigitalInput(roomId, offset, JoinMap.Digital.PowerToggle, "Power Toggle");
            for (int i = 0; i < 5; i++)
                BindDigitalInput(roomId, offset, JoinMap.Digital.SourceSelect1 + i, "Source Select " + (i + 1));
            BindDigitalInput(roomId, offset, JoinMap.Digital.VolumeUp, "Volume Up");
            BindDigitalInput(roomId, offset, JoinMap.Digital.VolumeDown, "Volume Down");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MuteToggle, "Mute Toggle");
            BindDigitalInput(roomId, offset, JoinMap.Digital.PowerOn, "Power On");
            BindDigitalInput(roomId, offset, JoinMap.Digital.PowerOff, "Power Off");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaPlayPause, "Media Play/Pause");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaStop, "Media Stop");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaUp, "Media Up");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaDown, "Media Down");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaLeft, "Media Left");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaRight, "Media Right");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaSelect, "Media Select");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaMenu, "Media Menu");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaHome, "Media Home");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaNext, "Media Next");
            BindDigitalInput(roomId, offset, JoinMap.Digital.MediaPrevious, "Media Previous");
            for (int i = 0; i < 4; i++)
                BindDigitalInput(roomId, offset, JoinMap.Digital.LightingScene1 + i, "Lighting Scene " + (i + 1));
            BindDigitalInput(roomId, offset, JoinMap.Digital.ShadeOpen, "Shade Open");
            BindDigitalInput(roomId, offset, JoinMap.Digital.ShadeClose, "Shade Close");
            BindDigitalInput(roomId, offset, JoinMap.Digital.ShadeStop, "Shade Stop");
            BindDigitalInput(roomId, offset, JoinMap.Digital.HvacModeToggle, "HVAC Mode Toggle");
            BindDigitalInput(roomId, offset, JoinMap.Digital.HvacOnOff, "HVAC On/Off");
            BindDigitalInput(roomId, offset, JoinMap.Digital.SecurityArmAway, "Security Arm Away");
            BindDigitalInput(roomId, offset, JoinMap.Digital.SecurityArmStay, "Security Arm Stay");
            BindDigitalInput(roomId, offset, JoinMap.Digital.SecurityArmNight, "Security Arm Night");
            BindDigitalInput(roomId, offset, JoinMap.Digital.SecurityDisarm, "Security Disarm");
            BindDigitalInput(roomId, offset, JoinMap.Digital.SecurityPanic, "Security Panic");
            BindDigitalInput(roomId, offset, JoinMap.Digital.SecurityStatusRequest, "Security Status Request");

            // Digital output joins (program → panel)
            BindDigitalOutput(roomId, offset, JoinMap.Digital.PowerFeedback, "Power FB");
            for (int i = 0; i < 5; i++)
                BindDigitalOutput(roomId, offset, JoinMap.Digital.SourceFeedback1 + i, "Source FB " + (i + 1));
            BindDigitalOutput(roomId, offset, JoinMap.Digital.MuteFeedback, "Mute FB");
            for (int i = 0; i < 4; i++)
                BindDigitalOutput(roomId, offset, JoinMap.Digital.LightingSceneFb1 + i, "Lighting Scene FB " + (i + 1));
            BindDigitalOutput(roomId, offset, JoinMap.Digital.SecurityArmedAwayFb, "Security Armed Away FB");
            BindDigitalOutput(roomId, offset, JoinMap.Digital.SecurityArmedStayFb, "Security Armed Stay FB");
            BindDigitalOutput(roomId, offset, JoinMap.Digital.SecurityArmedNightFb, "Security Armed Night FB");
            BindDigitalOutput(roomId, offset, JoinMap.Digital.SecurityDisarmedFb, "Security Disarmed FB");
            BindDigitalOutput(roomId, offset, JoinMap.Digital.SecurityAlarmActiveFb, "Security Alarm Active FB");
            BindDigitalOutput(roomId, offset, JoinMap.Digital.SecurityTroubleFb, "Security Trouble FB");
            BindDigitalOutput(roomId, offset, JoinMap.Digital.SecurityReadyFb, "Security Ready FB");
            for (int i = 0; i < 8; i++)
                BindDigitalOutput(roomId, offset, JoinMap.Digital.SecurityZone1Fb + i, "Security Zone " + (i + 1) + " FB");

            // Analog input joins
            BindAnalogInput(roomId, offset, JoinMap.Analog.VolumeSet, "Volume Set");
            BindAnalogInput(roomId, offset, JoinMap.Analog.LightingSet, "Lighting Set");
            BindAnalogInput(roomId, offset, JoinMap.Analog.ShadeSet, "Shade Set");
            BindAnalogInput(roomId, offset, JoinMap.Analog.TempSetpointSet, "Temp Setpoint Set");

            // Analog output joins
            BindAnalogOutput(roomId, offset, JoinMap.Analog.VolumeLevelFeedback, "Volume Level FB");
            BindAnalogOutput(roomId, offset, JoinMap.Analog.LightingLevelFeedback, "Lighting Level FB");
            BindAnalogOutput(roomId, offset, JoinMap.Analog.ShadePositionFeedback, "Shade Position FB");
            BindAnalogOutput(roomId, offset, JoinMap.Analog.TempCurrent, "Temp Current");
            BindAnalogOutput(roomId, offset, JoinMap.Analog.TempSetpointFeedback, "Temp Setpoint FB");

            // Serial input joins
            BindSerialInput(roomId, offset, JoinMap.Serial.SecurityDisarmCode, "Security Disarm Code");

            // Serial output joins
            BindSerialOutput(roomId, offset, JoinMap.Serial.SourceName, "Source Name");
            BindSerialOutput(roomId, offset, JoinMap.Serial.RoomName, "Room Name");
            BindSerialOutput(roomId, offset, JoinMap.Serial.SceneName, "Scene Name");
            BindSerialOutput(roomId, offset, JoinMap.Serial.HvacMode, "HVAC Mode");
            BindSerialOutput(roomId, offset, JoinMap.Serial.StatusText, "Status Text");
            BindSerialOutput(roomId, offset, JoinMap.Serial.SecurityArmMode, "Security Arm Mode");
            BindSerialOutput(roomId, offset, JoinMap.Serial.SecurityStatus, "Security Status");

            _logger.Info("Room " + roomId + " bound successfully");
        }

        private void BindDigitalInput(string roomId, int roomOffset, int joinOffset, string name)
        {
            var joinNumber = JoinMap.Resolve(roomOffset, joinOffset);
            var signalKey = "digital:" + roomId + ":" + joinOffset;

            try
            {
                var sig = _endpoint.GetDigitalOutput(joinNumber);
                var signal = _signals.GetOrCreate(signalKey);

                sig.SigChange += (src, args) =>
                {
                    signal?.Set(args.Sig.BoolValue);
                    _systemEngine.ProcessSignalChange(signalKey, args.Sig.BoolValue);
                };
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to bind digital input " + name + " (join " + joinNumber + "): " + ex.Message);
            }
        }

        private void BindDigitalOutput(string roomId, int roomOffset, int joinOffset, string name)
        {
            var joinNumber = JoinMap.Resolve(roomOffset, joinOffset);
            var signalKey = "digital:" + roomId + ":" + joinOffset;

            try
            {
                var sig = _endpoint.GetDigitalInput(joinNumber);
                var signal = _signals.GetOrCreate(signalKey);

                // Sync initial value
                var currentValue = signal?.Get();
                if (currentValue is bool bv)
                {
                    sig.BoolValue = bv;
                }

                signal.ValueChanged += (s, val) =>
                {
                    if (val is bool b) sig.BoolValue = b;
                };
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to bind digital output " + name + " (join " + joinNumber + "): " + ex.Message);
            }
        }

        private void BindAnalogInput(string roomId, int roomOffset, int joinOffset, string name)
        {
            var joinNumber = JoinMap.Resolve(roomOffset, joinOffset);
            var signalKey = "analog:" + roomId + ":" + joinOffset;

            try
            {
                var sig = _endpoint.GetAnalogOutput(joinNumber);
                var signal = _signals.GetOrCreate(signalKey);

                sig.SigChange += (src, args) =>
                {
                    signal?.Set(args.Sig.UShortValue);
                    _systemEngine.ProcessSignalChange(signalKey, args.Sig.UShortValue);
                };
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to bind analog input " + name + " (join " + joinNumber + "): " + ex.Message);
            }
        }

        private void BindAnalogOutput(string roomId, int roomOffset, int joinOffset, string name)
        {
            var joinNumber = JoinMap.Resolve(roomOffset, joinOffset);
            var signalKey = "analog:" + roomId + ":" + joinOffset;

            try
            {
                var sig = _endpoint.GetAnalogInput(joinNumber);
                var signal = _signals.GetOrCreate(signalKey);

                var currentValue = signal?.Get();
                if (currentValue is ushort uv)
                {
                    sig.UShortValue = uv;
                }

                signal.ValueChanged += (s, val) =>
                {
                    if (val is ushort u) sig.UShortValue = u;
                };
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to bind analog output " + name + " (join " + joinNumber + "): " + ex.Message);
            }
        }

        private void BindSerialInput(string roomId, int roomOffset, int joinOffset, string name)
        {
            var joinNumber = JoinMap.Resolve(roomOffset, joinOffset);
            var signalKey = "serial:" + roomId + ":" + joinOffset;

            try
            {
                var sig = _endpoint.GetSerialOutput(joinNumber);
                var signal = _signals.GetOrCreate(signalKey);

                sig.SigChange += (src, args) =>
                {
                    signal?.Set(args.Sig.StringValue);
                    _systemEngine.ProcessSignalChange(signalKey, args.Sig.StringValue);
                };
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to bind serial input " + name + " (join " + joinNumber + "): " + ex.Message);
            }
        }

        private void BindSerialOutput(string roomId, int roomOffset, int joinOffset, string name)
        {
            var joinNumber = JoinMap.Resolve(roomOffset, joinOffset);
            var signalKey = "serial:" + roomId + ":" + joinOffset;

            try
            {
                var sig = _endpoint.GetSerialInput(joinNumber);
                var signal = _signals.GetOrCreate(signalKey);

                var currentValue = signal?.Get();
                if (currentValue is string sv)
                {
                    sig.StringValue = sv;
                }

                signal.ValueChanged += (s, val) =>
                {
                    sig.StringValue = val?.ToString() ?? "";
                };
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to bind serial output " + name + " (join " + joinNumber + "): " + ex.Message);
            }
        }
    }
}
