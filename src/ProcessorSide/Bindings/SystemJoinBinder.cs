using System;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Bindings
{
    /// <summary>
    /// Binds system-level joins (offset 900+) for All Off, scene triggers,
    /// and system status. Routes input signals to the SystemEngine/SceneEngine.
    /// </summary>
    public sealed class SystemJoinBinder
    {
        private readonly IJoinEndpoint _endpoint;
        private readonly SignalRegistry _signals;
        private readonly SystemEngine _systemEngine;
        private readonly ILogger _logger;

        public SystemJoinBinder(IJoinEndpoint endpoint, SignalRegistry signals, SystemEngine systemEngine, ILogger logger)
        {
            _endpoint = endpoint ?? throw new ArgumentNullException(nameof(endpoint));
            _signals = signals ?? throw new ArgumentNullException(nameof(signals));
            _systemEngine = systemEngine ?? throw new ArgumentNullException(nameof(systemEngine));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public void Bind()
        {
            _logger.Info("Binding system joins at offset " + JoinMap.SystemOffset);

            // Digital input: All Off
            BindDigitalInput(JoinMap.SystemDigital.AllOff, "All Off");

            // Digital input: Scene Triggers 1-10
            for (int i = 0; i < 10; i++)
            {
                BindDigitalInput(JoinMap.SystemDigital.SceneTrigger1 + i, "Scene Trigger " + (i + 1));
            }

            // Digital output: Scene Feedback 1-10
            for (int i = 0; i < 10; i++)
            {
                BindDigitalOutput(JoinMap.SystemDigital.SceneFeedback1 + i, "Scene FB " + (i + 1));
            }

            // Serial output: System Status
            BindSerialOutput(JoinMap.SystemSerial.SystemStatus, "System Status");

            // Serial output: Active Scene Name
            BindSerialOutput(JoinMap.SystemSerial.ActiveSceneName, "Active Scene Name");

            _logger.Info("System joins bound successfully");
        }

        private void BindDigitalInput(int sysOffset, string name)
        {
            var joinNumber = JoinMap.ResolveSystem(sysOffset);
            var signalKey = "digital:system:" + sysOffset;

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
                _logger.Error("Failed to bind system digital input " + name + " (join " + joinNumber + "): " + ex.Message);
            }
        }

        private void BindDigitalOutput(int sysOffset, string name)
        {
            var joinNumber = JoinMap.ResolveSystem(sysOffset);
            var signalKey = "digital:system:" + sysOffset;

            try
            {
                var sig = _endpoint.GetDigitalInput(joinNumber);
                var signal = _signals.GetOrCreate(signalKey);

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
                _logger.Error("Failed to bind system digital output " + name + " (join " + joinNumber + "): " + ex.Message);
            }
        }

        private void BindSerialOutput(int sysOffset, string name)
        {
            var joinNumber = JoinMap.ResolveSystem(sysOffset);
            var signalKey = "serial:" + JoinMap.SystemOffset + ":" + sysOffset;

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
                _logger.Error("Failed to bind system serial output " + name + " (join " + joinNumber + "): " + ex.Message);
            }
        }
    }
}
