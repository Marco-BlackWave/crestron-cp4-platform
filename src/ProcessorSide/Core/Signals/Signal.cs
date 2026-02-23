using System;

namespace CrestronCP4.ProcessorSide.Core.Signals
{
    public sealed class Signal : ISignal
    {
        private readonly object _lock = new object();
        private object _value;

        public Signal(string name)
        {
            Name = name;
        }

        public string Name { get; }

        public object Get()
        {
            lock (_lock)
            {
                return _value;
            }
        }

        public void Set(object value)
        {
            lock (_lock)
            {
                if (Equals(_value, value))
                {
                    return;
                }

                _value = value;
            }

            ValueChanged?.Invoke(this, new SignalChangedEventArgs(Name, value));
        }

        public void ClearHandlers()
        {
            ValueChanged = null;
        }

        public event EventHandler<SignalChangedEventArgs> ValueChanged;
    }

    public sealed class SignalChangedEventArgs : EventArgs
    {
        public SignalChangedEventArgs(string name, object value)
        {
            Name = name;
            Value = value;
        }

        public string Name { get; }
        public object Value { get; }
    }
}
