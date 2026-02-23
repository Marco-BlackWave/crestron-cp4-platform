using System;

namespace CrestronCP4.ProcessorSide.Core.Signals
{
    public interface ISignal
    {
        string Name { get; }
        object Get();
        void Set(object value);
        event EventHandler<SignalChangedEventArgs> ValueChanged;
    }
}
