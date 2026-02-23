using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Core
{
    /// <summary>
    /// Executes scenes across rooms. A scene can set lighting levels, shade positions,
    /// AV state, and source selection for one or more rooms.
    /// System-wide scene triggers use joins at offset 900+.
    /// </summary>
    public sealed class SceneEngine
    {
        private readonly List<SceneConfig> _scenes;
        private readonly Dictionary<string, RoomController> _rooms;
        private readonly SignalRegistry _signals;
        private readonly ILogger _logger;
        private string _activeSceneId;

        public SceneEngine(List<SceneConfig> scenes, Dictionary<string, RoomController> rooms, SignalRegistry signals, ILogger logger)
        {
            _scenes = scenes ?? new List<SceneConfig>();
            _rooms = rooms ?? throw new ArgumentNullException(nameof(rooms));
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Processes system-level signal changes (scene triggers, All Off).
        /// </summary>
        public void ProcessSignalChange(string signalKey, object value)
        {
            if (signalKey == null || !(value is bool pressed) || !pressed) return;

            // Check for system digital signals
            var prefix = "digital:system:";
            if (!signalKey.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return;

            if (!int.TryParse(signalKey.Substring(prefix.Length), out int offset)) return;

            if (offset == JoinMap.SystemDigital.AllOff)
            {
                ExecuteAllOff();
            }
            else if (offset >= JoinMap.SystemDigital.SceneTrigger1 && offset <= JoinMap.SystemDigital.SceneTrigger10)
            {
                int sceneIndex = offset - JoinMap.SystemDigital.SceneTrigger1;
                if (sceneIndex < _scenes.Count)
                {
                    ExecuteScene(_scenes[sceneIndex]);
                }
            }
        }

        public void ExecuteScene(SceneConfig scene)
        {
            if (scene == null) return;

            _logger.Info("Executing scene: " + scene.Name);
            _activeSceneId = scene.Id;

            var targetRooms = ResolveTargetRooms(scene.Rooms);

            foreach (var room in targetRooms)
            {
                try
                {
                    ApplySceneToRoom(room, scene.Actions);
                }
                catch (Exception ex)
                {
                    _logger.Error("Scene " + scene.Name + " failed for room " + room.RoomId + ": " + ex.Message);
                }
            }

            UpdateSceneFeedback(scene);

            // Update active scene name
            var sceneNameSignal = _signals.GetOrCreate("serial:" + JoinMap.SystemOffset + ":" + JoinMap.SystemSerial.ActiveSceneName);
            sceneNameSignal?.Set(scene.Name);

            _logger.Info("Scene " + scene.Name + " complete");
        }

        public void ExecuteScene(string sceneId)
        {
            var scene = _scenes.Find(s => string.Equals(s.Id, sceneId, StringComparison.OrdinalIgnoreCase));
            if (scene != null)
            {
                ExecuteScene(scene);
            }
            else
            {
                _logger.Warn("Scene not found: " + sceneId);
            }
        }

        private void ExecuteAllOff()
        {
            _logger.Info("Executing All Off");
            _activeSceneId = null;

            foreach (var room in _rooms.Values)
            {
                try
                {
                    room.SetLightingLevel(0);
                    room.SetShadeState("closed");
                    room.PowerOffAv();
                }
                catch (Exception ex)
                {
                    _logger.Error("All Off failed for room " + room.RoomId + ": " + ex.Message);
                }
            }

            ClearSceneFeedback();

            var sceneNameSignal = _signals.GetOrCreate("serial:" + JoinMap.SystemOffset + ":" + JoinMap.SystemSerial.ActiveSceneName);
            sceneNameSignal?.Set("All Off");
        }

        private void ApplySceneToRoom(RoomController room, SceneActions actions)
        {
            if (actions == null) return;

            // Lighting
            if (actions.Lighting >= 0)
            {
                room.SetLightingLevel(actions.Lighting);
            }

            // Shades
            if (!string.IsNullOrEmpty(actions.Shades))
            {
                room.SetShadeState(actions.Shades);
            }

            // AV
            if (string.Equals(actions.Av, "off", StringComparison.OrdinalIgnoreCase))
            {
                room.PowerOffAv();
            }

            // Security
            if (!string.IsNullOrEmpty(actions.Security))
            {
                room.ArmSecurity(actions.Security);
            }
        }

        private List<RoomController> ResolveTargetRooms(List<string> roomRefs)
        {
            var result = new List<RoomController>();

            if (roomRefs == null || roomRefs.Count == 0)
            {
                return result;
            }

            foreach (var roomRef in roomRefs)
            {
                if (string.Equals(roomRef, "all", StringComparison.OrdinalIgnoreCase))
                {
                    result.AddRange(_rooms.Values);
                    return result;
                }

                if (_rooms.TryGetValue(roomRef, out var room))
                {
                    result.Add(room);
                }
            }

            return result;
        }

        private void UpdateSceneFeedback(SceneConfig scene)
        {
            ClearSceneFeedback();

            int sceneIndex = _scenes.IndexOf(scene);
            if (sceneIndex >= 0 && sceneIndex < 10)
            {
                var fbSignal = _signals.GetOrCreate("digital:system:" + (JoinMap.SystemDigital.SceneFeedback1 + sceneIndex));
                fbSignal?.Set(true);
            }
        }

        private void ClearSceneFeedback()
        {
            for (int i = 0; i < 10; i++)
            {
                var fbSignal = _signals.GetOrCreate("digital:system:" + (JoinMap.SystemDigital.SceneFeedback1 + i));
                fbSignal?.Set(false);
            }
        }
    }
}
