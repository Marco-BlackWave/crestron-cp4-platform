using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;
using CrestronCP4.ProcessorSide.Devices;

namespace CrestronCP4.ProcessorSide.Subsystems
{
    /// <summary>
    /// AV subsystem: manages display power, source routing, and volume control.
    /// Uses IDisplayDriver for display and IAudioDriver for audio.
    /// </summary>
    public sealed class AvSubsystem : ISubsystem
    {
        private readonly List<IDisplayDriver> _displays;
        private readonly List<IAudioDriver> _audios;
        private readonly List<IMediaDriver> _medias;
        private readonly List<string> _sourceNames;
        private readonly ILogger _logger;
        private SignalRegistry _signals;
        private string _roomId;
        private int _joinOffset;
        private int _activeSource = -1;
        private bool _disposed;

        // Primary drivers for feedback (first in list)
        private IDisplayDriver _display => _displays.Count > 0 ? _displays[0] : null;
        private IAudioDriver _audio => _audios.Count > 0 ? _audios[0] : null;
        private IMediaDriver _media => _medias.Count > 0 ? _medias[0] : null;

        public string Id => "av";

        public AvSubsystem(List<IDisplayDriver> displays, List<IAudioDriver> audios, List<IMediaDriver> medias, List<string> sourceNames, ILogger logger)
        {
            _displays = displays ?? new List<IDisplayDriver>();
            _audios = audios ?? new List<IAudioDriver>();
            _medias = medias ?? new List<IMediaDriver>();
            _sourceNames = sourceNames ?? new List<string>();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>Backward-compatible single-driver constructor.</summary>
        public AvSubsystem(IDisplayDriver display, IAudioDriver audio, List<string> sourceNames, ILogger logger)
            : this(
                display != null ? new List<IDisplayDriver> { display } : new List<IDisplayDriver>(),
                audio != null ? new List<IAudioDriver> { audio } : new List<IAudioDriver>(),
                new List<IMediaDriver>(),
                sourceNames, logger)
        { }

        public void Initialize(SignalRegistry signals, string roomId, int joinOffset)
        {
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _roomId = roomId;
            _joinOffset = joinOffset;

            // Set room name serial
            var roomNameSignal = _signals.GetOrCreate(MakeKey("serial", JoinMap.Serial.RoomName));
            // Power feedback
            UpdatePowerFeedback();

            // Wire display feedback for all displays
            foreach (var display in _displays)
            {
                display.FeedbackReceived += OnDisplayFeedback;
            }
            foreach (var audio in _audios)
            {
                audio.FeedbackReceived += OnAudioFeedback;
            }

            _logger.Info("AV subsystem initialized for room " + roomId);
        }

        public void ProcessSignalChange(string signalKey, object value)
        {
            // Parse the signal key to determine which join changed
            if (!TryParseJoinOffset(signalKey, "digital", out int offset)) return;

            switch (offset)
            {
                case JoinMap.Digital.PowerToggle:
                    HandlePowerToggle();
                    break;

                case JoinMap.Digital.VolumeUp:
                    if (value is bool vu && vu)
                        foreach (var a in _audios) { try { a.VolumeUp(); } catch { } }
                    break;

                case JoinMap.Digital.VolumeDown:
                    if (value is bool vd && vd)
                        foreach (var a in _audios) { try { a.VolumeDown(); } catch { } }
                    break;

                case JoinMap.Digital.MuteToggle:
                    if (value is bool mt && mt)
                        foreach (var a in _audios) { try { a.MuteToggle(); } catch { } }
                    break;

                case JoinMap.Digital.PowerOn:
                    if (value is bool pon && pon)
                    {
                        foreach (var d in _displays)
                        {
                            try { d.PowerOn(); } catch (Exception ex) { _logger.Error("Display power on error: " + ex.Message); }
                        }
                        UpdatePowerFeedback();
                    }
                    break;

                case JoinMap.Digital.PowerOff:
                    if (value is bool pof && pof)
                    {
                        foreach (var d in _displays)
                        {
                            try { d.PowerOff(); } catch (Exception ex) { _logger.Error("Display power off error: " + ex.Message); }
                        }
                        UpdatePowerFeedback();
                    }
                    break;

                case JoinMap.Digital.MediaPlayPause:
                    if (value is bool pp && pp)
                    {
                        foreach (var media in _medias)
                        {
                            try { if (media.IsPlaying) media.Pause(); else media.Play(); } catch (Exception ex) { _logger.Error("Media play/pause error: " + ex.Message); }
                        }
                    }
                    break;

                case JoinMap.Digital.MediaStop:
                    if (value is bool stp && stp)
                        foreach (var media in _medias) { try { media.Stop(); } catch (Exception ex) { _logger.Error("Media stop error: " + ex.Message); } }
                    break;

                case JoinMap.Digital.MediaUp:
                    if (value is bool up && up)
                        foreach (var media in _medias) { try { media.Up(); } catch (Exception ex) { _logger.Error("Media up error: " + ex.Message); } }
                    break;

                case JoinMap.Digital.MediaDown:
                    if (value is bool down && down)
                        foreach (var media in _medias) { try { media.Down(); } catch (Exception ex) { _logger.Error("Media down error: " + ex.Message); } }
                    break;

                case JoinMap.Digital.MediaLeft:
                    if (value is bool left && left)
                        foreach (var media in _medias) { try { media.Left(); } catch (Exception ex) { _logger.Error("Media left error: " + ex.Message); } }
                    break;

                case JoinMap.Digital.MediaRight:
                    if (value is bool right && right)
                        foreach (var media in _medias) { try { media.Right(); } catch (Exception ex) { _logger.Error("Media right error: " + ex.Message); } }
                    break;

                case JoinMap.Digital.MediaSelect:
                    if (value is bool sel && sel)
                        foreach (var media in _medias) { try { media.Select(); } catch (Exception ex) { _logger.Error("Media select error: " + ex.Message); } }
                    break;

                case JoinMap.Digital.MediaMenu:
                    if (value is bool menu && menu)
                        foreach (var media in _medias) { try { media.Menu(); } catch (Exception ex) { _logger.Error("Media menu error: " + ex.Message); } }
                    break;

                case JoinMap.Digital.MediaHome:
                    if (value is bool home && home)
                        foreach (var media in _medias) { try { media.Home(); } catch (Exception ex) { _logger.Error("Media home error: " + ex.Message); } }
                    break;

                case JoinMap.Digital.MediaNext:
                    if (value is bool next && next)
                        foreach (var media in _medias) { try { media.Next(); } catch (Exception ex) { _logger.Error("Media next error: " + ex.Message); } }
                    break;

                case JoinMap.Digital.MediaPrevious:
                    if (value is bool prev && prev)
                        foreach (var media in _medias) { try { media.Previous(); } catch (Exception ex) { _logger.Error("Media previous error: " + ex.Message); } }
                    break;

                default:
                    // Check source selects (offset 2-6)
                    if (offset >= JoinMap.Digital.SourceSelect1 && offset <= JoinMap.Digital.SourceSelect5)
                    {
                        if (value is bool ss && ss)
                        {
                            int sourceIndex = offset - JoinMap.Digital.SourceSelect1;
                            SelectSource(sourceIndex);
                        }
                    }
                    break;
            }
        }

        private void HandlePowerToggle()
        {
            if (_display == null) return;

            var turnOn = !_display.IsPoweredOn;
            foreach (var d in _displays)
            {
                try
                {
                    if (turnOn) d.PowerOn(); else d.PowerOff();
                }
                catch (Exception ex) { _logger.Error("Display power error: " + ex.Message); }
            }
            UpdatePowerFeedback();
        }

        private void SelectSource(int index)
        {
            if (index < 0 || index >= _sourceNames.Count) return;

            _activeSource = index;

            // Select input on all displays
            foreach (var d in _displays)
            {
                try { d.SelectInput("hdmi" + (index + 1)); }
                catch (Exception ex) { _logger.Error("Display input select error: " + ex.Message); }
            }

            // Update source feedback
            for (int i = 0; i < 5; i++)
            {
                var fbSignal = _signals.GetOrCreate(MakeKey("digital", JoinMap.Digital.SourceFeedback1 + i));
                fbSignal?.Set(i == index);
            }

            // Update source name serial
            var nameSignal = _signals.GetOrCreate(MakeKey("serial", JoinMap.Serial.SourceName));
            nameSignal?.Set(_sourceNames[index]);

            _logger.Info("Room " + _roomId + ": source " + _sourceNames[index] + " selected");
        }

        private void UpdatePowerFeedback()
        {
            var powerFb = _signals.GetOrCreate(MakeKey("digital", JoinMap.Digital.PowerFeedback));
            powerFb?.Set(_display?.IsPoweredOn ?? false);
        }

        private void OnDisplayFeedback(object sender, DeviceFeedbackEventArgs e)
        {
            if (e.Property == "power")
            {
                UpdatePowerFeedback();
            }
        }

        private void OnAudioFeedback(object sender, DeviceFeedbackEventArgs e)
        {
            switch (e.Property)
            {
                case "volume":
                    var volSignal = _signals.GetOrCreate(MakeKey("analog", JoinMap.Analog.VolumeLevelFeedback));
                    if (e.Value is int vol)
                    {
                        // Scale 0-100 to 0-65535
                        volSignal?.Set((ushort)(vol * 655));
                    }
                    break;

                case "mute":
                    var muteSignal = _signals.GetOrCreate(MakeKey("digital", JoinMap.Digital.MuteFeedback));
                    muteSignal?.Set(e.Value);
                    break;
            }
        }

        private bool TryParseJoinOffset(string signalKey, string expectedType, out int offset)
        {
            offset = -1;
            if (signalKey == null) return false;

            // Signal key format: "{type}:{roomId}:{offset}" or we match by room prefix
            var prefix = expectedType + ":" + _roomId + ":";
            if (signalKey.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return int.TryParse(signalKey.Substring(prefix.Length), out offset);
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
            foreach (var d in _displays) d.FeedbackReceived -= OnDisplayFeedback;
            foreach (var a in _audios) a.FeedbackReceived -= OnAudioFeedback;
        }
    }
}
