using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Bindings
{
    public sealed class JoinBinder
    {
        private readonly IJoinEndpoint _endpoint;
        private readonly ILogger _logger;
        private readonly SignalRegistry _signals;
        private readonly List<IJoinBinding> _bindings = new List<IJoinBinding>();

        public JoinBinder(IJoinEndpoint endpoint, SignalRegistry signals, ILogger logger)
        {
            _endpoint = endpoint;
            _signals = signals;
            _logger = logger;
        }

        public void BindAll(JoinListConfig config)
        {
            if (config == null || config.Joins == null)
            {
                return;
            }

            BindGroup(config.Joins.Digital, JoinType.Digital);
            BindGroup(config.Joins.Analog, JoinType.Analog);
            BindGroup(config.Joins.Serial, JoinType.Serial);

            _logger.Info("Bindings active: " + _bindings.Count);
        }

        private void BindGroup(List<JoinEntry> joins, JoinType joinType)
        {
            if (joins == null)
            {
                return;
            }

            foreach (var entry in joins)
            {
                try
                {
                    // Use composite key to prevent cross-type signal name collisions
                    var signalKey = joinType.ToString().ToLower() + ":" + entry.Name;
                    var signal = _signals.GetOrCreate(signalKey);
                    if (signal == null)
                    {
                        _logger.Warn("Skipping join " + entry.Join + ": could not create signal for '" + entry.Name + "'.");
                        continue;
                    }

                    IJoinBinding binding = null;
                    if (joinType == JoinType.Digital)
                    {
                        binding = new DigitalJoinBinding(_endpoint, entry, signal, _logger);
                    }
                    else if (joinType == JoinType.Analog)
                    {
                        binding = new AnalogJoinBinding(_endpoint, entry, signal, _logger);
                    }
                    else if (joinType == JoinType.Serial)
                    {
                        binding = new SerialJoinBinding(_endpoint, entry, signal, _logger);
                    }

                    if (binding != null)
                    {
                        binding.Bind();
                        _bindings.Add(binding);
                    }
                }
                catch (Exception ex)
                {
                    _logger.Error("Failed to bind " + joinType + " join " + entry.Join + " (" + entry.Name + "): " + ex.Message);
                }
            }
        }
    }

    internal enum JoinType
    {
        Digital,
        Analog,
        Serial
    }
}
