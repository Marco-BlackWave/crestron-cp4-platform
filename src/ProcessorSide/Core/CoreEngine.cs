using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Core
{
    public sealed class CoreEngine
    {
        private readonly ILogger _logger;
        public SignalRegistry Signals { get; }

        public CoreEngine(ILogger logger)
        {
            _logger = logger;
            Signals = new SignalRegistry();
        }

        public void Initialize(IEnumerable<string> signalNames)
        {
            if (signalNames == null)
            {
                return;
            }

            foreach (var name in signalNames)
            {
                Signals.GetOrCreate(name);
            }

            _logger.Info("Core initialized.");
        }

        public void Start()
        {
            _logger.Info("Core started.");
        }

        public void Stop()
        {
            Signals.ClearAll();
            _logger.Info("Core stopped.");
        }
    }
}
