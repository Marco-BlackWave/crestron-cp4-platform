using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CoreTests
{
    /// <summary>
    /// Tests for scene configuration models and signal-based scene behavior.
    /// SceneEngine itself depends on RoomController (Crestron chain),
    /// so we test the configuration models and signal registry behavior here.
    /// </summary>
    public class SceneEngineTests
    {
        private class TestLogger : ILogger
        {
            public List<string> Messages { get; } = new();
            public void Info(string message) => Messages.Add("INFO: " + message);
            public void Warn(string message) => Messages.Add("WARN: " + message);
            public void Error(string message) => Messages.Add("ERROR: " + message);
        }

        [Fact]
        public void SceneConfig_Properties()
        {
            var scene = new SceneConfig
            {
                Id = "movie",
                Name = "Movie Night",
                Rooms = new List<string> { "living" },
                Actions = new SceneActions { Lighting = 20, Shades = "closed", Source = "appletv" }
            };
            Assert.Equal("movie", scene.Id);
            Assert.Equal("Movie Night", scene.Name);
            Assert.Single(scene.Rooms);
            Assert.Equal(20, scene.Actions.Lighting);
        }

        [Fact]
        public void SceneConfig_AllRooms()
        {
            var scene = new SceneConfig
            {
                Id = "goodnight",
                Name = "Good Night",
                Rooms = new List<string> { "all" }
            };
            Assert.Contains("all", scene.Rooms);
        }

        [Fact]
        public void SceneFeedback_SignalKeys()
        {
            var signals = new SignalRegistry();

            // Scene feedback signals use "digital:system:{offset}" keys
            for (int i = 0; i < 10; i++)
            {
                var key = "digital:system:" + (JoinMap.SystemDigital.SceneFeedback1 + i);
                var signal = signals.GetOrCreate(key);
                signal.Set(i == 0); // Only first scene active
            }

            var fb1 = signals.GetOrCreate("digital:system:" + JoinMap.SystemDigital.SceneFeedback1);
            Assert.Equal(true, fb1.Get());

            var fb2 = signals.GetOrCreate("digital:system:" + (JoinMap.SystemDigital.SceneFeedback1 + 1));
            Assert.Equal(false, fb2.Get());
        }

        [Fact]
        public void ActiveSceneName_SignalKey()
        {
            var signals = new SignalRegistry();
            var key = "serial:" + JoinMap.SystemOffset + ":" + JoinMap.SystemSerial.ActiveSceneName;
            var signal = signals.GetOrCreate(key);
            signal.Set("Movie Night");
            Assert.Equal("Movie Night", signal.Get());
        }

        [Fact]
        public void SystemStatus_SignalKey()
        {
            var signals = new SignalRegistry();
            var key = "serial:" + JoinMap.SystemOffset + ":" + JoinMap.SystemSerial.SystemStatus;
            var signal = signals.GetOrCreate(key);
            signal.Set("System Online");
            Assert.Equal("System Online", signal.Get());
        }

        [Fact]
        public void AllOff_ClearsFeedbacks()
        {
            var signals = new SignalRegistry();

            // Set scene 1 active
            var fb1Key = "digital:system:" + JoinMap.SystemDigital.SceneFeedback1;
            signals.GetOrCreate(fb1Key).Set(true);

            // Simulate All Off — clears all scene feedbacks
            for (int i = 0; i < 10; i++)
            {
                var key = "digital:system:" + (JoinMap.SystemDigital.SceneFeedback1 + i);
                signals.GetOrCreate(key).Set(false);
            }

            Assert.Equal(false, signals.GetOrCreate(fb1Key).Get());
        }

        [Fact]
        public void SceneTrigger_JoinNumbers()
        {
            // Scene trigger 1 = system offset 1 → join 901
            Assert.Equal((ushort)901, JoinMap.ResolveSystem(JoinMap.SystemDigital.SceneTrigger1));
            // Scene trigger 10 = system offset 10 → join 910
            Assert.Equal((ushort)910, JoinMap.ResolveSystem(JoinMap.SystemDigital.SceneTrigger10));
        }

        [Fact]
        public void SceneFeedback_JoinNumbers()
        {
            // Scene feedback 1 = system offset 11 → join 911
            Assert.Equal((ushort)911, JoinMap.ResolveSystem(JoinMap.SystemDigital.SceneFeedback1));
            // Scene feedback 10 = system offset 20 → join 920
            Assert.Equal((ushort)920, JoinMap.ResolveSystem(JoinMap.SystemDigital.SceneFeedback10));
        }

        [Fact]
        public void SceneActions_AllFields()
        {
            var actions = new SceneActions
            {
                Lighting = 50,
                Shades = "open",
                Source = "cable",
                Av = "on"
            };
            Assert.Equal(50, actions.Lighting);
            Assert.Equal("open", actions.Shades);
            Assert.Equal("cable", actions.Source);
            Assert.Equal("on", actions.Av);
        }

        [Fact]
        public void MultipleScenes_IndependentFeedbacks()
        {
            var signals = new SignalRegistry();

            // Simulate switching between scenes
            var keys = new List<string>();
            for (int i = 0; i < 10; i++)
            {
                keys.Add("digital:system:" + (JoinMap.SystemDigital.SceneFeedback1 + i));
                signals.GetOrCreate(keys[i]).Set(false);
            }

            // Activate scene 3
            signals.GetOrCreate(keys[2]).Set(true);
            Assert.Equal(false, signals.GetOrCreate(keys[0]).Get());
            Assert.Equal(false, signals.GetOrCreate(keys[1]).Get());
            Assert.Equal(true, signals.GetOrCreate(keys[2]).Get());
        }
    }
}
