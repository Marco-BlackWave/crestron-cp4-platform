using System;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Subsystems
{
    /// <summary>
    /// Base interface for all room subsystems (AV, Lighting, Shades, HVAC, etc.).
    /// Each subsystem manages a slice of the join map within a room's offset range.
    /// </summary>
    public interface ISubsystem : IDisposable
    {
        string Id { get; }
        void Initialize(SignalRegistry signals, string roomId, int joinOffset);
        void ProcessSignalChange(string signalKey, object value);
    }
}
