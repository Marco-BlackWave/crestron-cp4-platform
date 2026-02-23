using System.Collections.Concurrent;
using System.Collections.Generic;

namespace CrestronCP4.ProcessorSide.Core.Signals
{
    public sealed class SignalRegistry
    {
        private readonly ConcurrentDictionary<string, Signal> _signals = new ConcurrentDictionary<string, Signal>();

        public Signal GetOrCreate(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return null;
            }

            return _signals.GetOrAdd(name, key => new Signal(key));
        }

        public IEnumerable<Signal> All => _signals.Values;

        public void ClearAll()
        {
            foreach (var signal in _signals.Values)
            {
                signal.ClearHandlers();
            }

            _signals.Clear();
        }
    }
}
