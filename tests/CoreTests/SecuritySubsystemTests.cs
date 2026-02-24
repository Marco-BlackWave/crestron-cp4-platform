using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;
using CrestronCP4.ProcessorSide.Devices;
using CrestronCP4.ProcessorSide.Subsystems;
using CrestronCP4.ProcessorSide.Transport;

namespace CoreTests
{
    public class SecuritySubsystemTests
    {
        private readonly SignalRegistry _signals = new SignalRegistry();
        private readonly SecurityTestLogger _logger = new SecurityTestLogger();
        private readonly TestSecurityDriver _driver = new TestSecurityDriver();
        private const string RoomId = "room1";
        private const int JoinOffset = 0;

        private SecuritySubsystem CreateAndInitialize(ISecurityDriver driver = null)
        {
            var sub = new SecuritySubsystem(driver ?? _driver, _logger);
            sub.Initialize(_signals, RoomId, JoinOffset);
            return sub;
        }

        [Fact]
        public void Id_ReturnsSecurity()
        {
            var sub = new SecuritySubsystem(_driver, _logger);
            Assert.Equal("security", sub.Id);
        }

        [Fact]
        public void Initialize_SetsInitialDisarmedFeedback()
        {
            CreateAndInitialize();
            var signal = _signals.GetOrCreate("digital:" + RoomId + ":" + JoinMap.Digital.SecurityDisarmedFb);
            Assert.Equal(true, signal.Get());
        }

        [Fact]
        public void Initialize_SetsReadyFeedback()
        {
            _driver.SetReady(true);
            CreateAndInitialize();
            var signal = _signals.GetOrCreate("digital:" + RoomId + ":" + JoinMap.Digital.SecurityReadyFb);
            Assert.Equal(true, signal.Get());
        }

        [Fact]
        public void ArmAway_SendsCommandToDriver()
        {
            var sub = CreateAndInitialize();
            sub.ProcessSignalChange("digital:" + RoomId + ":" + JoinMap.Digital.SecurityArmAway, true);
            Assert.Equal("ArmAway", _driver.LastCommand);
        }

        [Fact]
        public void ArmStay_SendsCommandToDriver()
        {
            var sub = CreateAndInitialize();
            sub.ProcessSignalChange("digital:" + RoomId + ":" + JoinMap.Digital.SecurityArmStay, true);
            Assert.Equal("ArmStay", _driver.LastCommand);
        }

        [Fact]
        public void ArmNight_SendsCommandToDriver()
        {
            var sub = CreateAndInitialize();
            sub.ProcessSignalChange("digital:" + RoomId + ":" + JoinMap.Digital.SecurityArmNight, true);
            Assert.Equal("ArmNight", _driver.LastCommand);
        }

        [Fact]
        public void Disarm_WithCode_SendsCommandToDriver()
        {
            var sub = CreateAndInitialize();

            // Set the disarm code via serial signal
            var codeSignal = _signals.GetOrCreate("serial:" + RoomId + ":" + JoinMap.Serial.SecurityDisarmCode);
            codeSignal.Set("1234");

            sub.ProcessSignalChange("digital:" + RoomId + ":" + JoinMap.Digital.SecurityDisarm, true);
            Assert.Equal("Disarm:1234", _driver.LastCommand);
        }

        [Fact]
        public void Disarm_WithoutCode_DoesNotSend()
        {
            var sub = CreateAndInitialize();
            sub.ProcessSignalChange("digital:" + RoomId + ":" + JoinMap.Digital.SecurityDisarm, true);
            Assert.Null(_driver.LastCommand);
        }

        [Fact]
        public void Panic_SendsCommandToDriver()
        {
            var sub = CreateAndInitialize();
            sub.ProcessSignalChange("digital:" + RoomId + ":" + JoinMap.Digital.SecurityPanic, true);
            Assert.Equal("Panic", _driver.LastCommand);
        }

        [Fact]
        public void StatusRequest_SendsCommandToDriver()
        {
            var sub = CreateAndInitialize();
            sub.ProcessSignalChange("digital:" + RoomId + ":" + JoinMap.Digital.SecurityStatusRequest, true);
            Assert.Equal("StatusRequest", _driver.LastCommand);
        }

        [Fact]
        public void FalsePress_IsIgnored()
        {
            var sub = CreateAndInitialize();
            sub.ProcessSignalChange("digital:" + RoomId + ":" + JoinMap.Digital.SecurityArmAway, false);
            Assert.Null(_driver.LastCommand);
        }

        [Fact]
        public void ArmModeFeedback_UpdatesDigitalAndSerialSignals()
        {
            var sub = CreateAndInitialize();
            _driver.SimulateFeedback("armMode", "Armed Away");

            Assert.Equal(true, _signals.GetOrCreate("digital:" + RoomId + ":" + JoinMap.Digital.SecurityArmedAwayFb).Get());
            Assert.Equal(false, _signals.GetOrCreate("digital:" + RoomId + ":" + JoinMap.Digital.SecurityArmedStayFb).Get());
            Assert.Equal(false, _signals.GetOrCreate("digital:" + RoomId + ":" + JoinMap.Digital.SecurityDisarmedFb).Get());
            Assert.Equal("Armed Away", _signals.GetOrCreate("serial:" + RoomId + ":" + JoinMap.Serial.SecurityArmMode).Get());
        }

        [Fact]
        public void AlarmFeedback_UpdatesSignals()
        {
            var sub = CreateAndInitialize();
            _driver.SimulateFeedback("alarm", true);

            Assert.Equal(true, _signals.GetOrCreate("digital:" + RoomId + ":" + JoinMap.Digital.SecurityAlarmActiveFb).Get());
            Assert.Equal("Alarm!", _signals.GetOrCreate("serial:" + RoomId + ":" + JoinMap.Serial.SecurityStatus).Get());
        }

        [Fact]
        public void ZoneFeedback_UpdatesCorrectZoneSignal()
        {
            var sub = CreateAndInitialize();
            _driver.SimulateFeedback("zone3", true);

            var zoneSignal = _signals.GetOrCreate("digital:" + RoomId + ":" + (JoinMap.Digital.SecurityZone1Fb + 2));
            Assert.Equal(true, zoneSignal.Get());
        }

        [Fact]
        public void TroubleFeedback_UpdatesSignal()
        {
            var sub = CreateAndInitialize();
            _driver.SimulateFeedback("trouble", true);

            Assert.Equal(true, _signals.GetOrCreate("digital:" + RoomId + ":" + JoinMap.Digital.SecurityTroubleFb).Get());
        }

        [Fact]
        public void SetArmMode_Away_CallsDriverArmAway()
        {
            var sub = CreateAndInitialize();
            sub.SetArmMode("away");
            Assert.Equal("ArmAway", _driver.LastCommand);
        }

        [Fact]
        public void SetArmMode_Stay_CallsDriverArmStay()
        {
            var sub = CreateAndInitialize();
            sub.SetArmMode("stay");
            Assert.Equal("ArmStay", _driver.LastCommand);
        }

        [Fact]
        public void SetArmMode_Night_CallsDriverArmNight()
        {
            var sub = CreateAndInitialize();
            sub.SetArmMode("night");
            Assert.Equal("ArmNight", _driver.LastCommand);
        }

        [Fact]
        public void NullDriver_DoesNotThrow()
        {
            var sub = new SecuritySubsystem((ISecurityDriver)null, _logger);
            sub.Initialize(_signals, RoomId, JoinOffset);
            sub.ProcessSignalChange("digital:" + RoomId + ":" + JoinMap.Digital.SecurityArmAway, true);
            // Should not throw
        }

        [Fact]
        public void Dispose_UnsubscribesFromFeedback()
        {
            var sub = CreateAndInitialize();
            sub.Dispose();
            _driver.SimulateFeedback("armMode", "Armed Stay");

            // After dispose, the signal should still show initial "Disarmed" state
            Assert.Equal("Disarmed", _signals.GetOrCreate("serial:" + RoomId + ":" + JoinMap.Serial.SecurityArmMode).Get());
        }

        [Fact]
        public void SceneActions_SecurityField_Serializes()
        {
            var actions = new SceneActions { Security = "away" };
            Assert.Equal("away", actions.Security);
        }

        [Fact]
        public void JoinMap_SecurityOffsets_NoOverlapWithHvac()
        {
            Assert.True(JoinMap.Digital.SecurityArmAway > JoinMap.Digital.HvacOnOff);
            Assert.True(JoinMap.Digital.SecurityZone8Fb < JoinMap.JoinsPerRoom);
        }
    }

    internal sealed class SecurityTestLogger : ILogger
    {
        public List<string> Messages { get; } = new();
        public void Info(string message) => Messages.Add("INFO: " + message);
        public void Warn(string message) => Messages.Add("WARN: " + message);
        public void Error(string message) => Messages.Add("ERROR: " + message);
    }

    /// <summary>
    /// Test stub for ISecurityDriver.
    /// </summary>
    internal sealed class TestSecurityDriver : ISecurityDriver
    {
        public string DeviceId => "test-security";
        public bool IsOnline => true;
        public string ArmMode { get; private set; } = "Disarmed";
        public bool IsAlarmActive { get; private set; }
        public bool IsReady { get; private set; }
        public bool IsTrouble { get; private set; }
        public int ZoneCount => 8;
        public string LastCommand { get; private set; }

        private readonly bool[] _zones = new bool[8];

        public event EventHandler<DeviceFeedbackEventArgs> FeedbackReceived;

        public void Initialize(ITransport transport) { }

        public void ArmAway() => LastCommand = "ArmAway";
        public void ArmStay() => LastCommand = "ArmStay";
        public void ArmNight() => LastCommand = "ArmNight";
        public void Panic() => LastCommand = "Panic";
        public void StatusRequest() => LastCommand = "StatusRequest";

        public void Disarm(string code) => LastCommand = "Disarm:" + code;

        public bool IsZoneOpen(int zone)
        {
            if (zone < 1 || zone > ZoneCount) return false;
            return _zones[zone - 1];
        }

        public void SetReady(bool ready) => IsReady = ready;

        public void SimulateFeedback(string property, object value)
        {
            FeedbackReceived?.Invoke(this, new DeviceFeedbackEventArgs(property, value));
        }

        public void Dispose() { }
    }
}
