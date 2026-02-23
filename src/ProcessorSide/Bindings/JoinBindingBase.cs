using System;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Bindings
{
    internal interface IJoinBinding
    {
        void Bind();
    }

    internal abstract class JoinBindingBase : IJoinBinding
    {
        protected readonly IJoinEndpoint Endpoint;
        protected readonly JoinEntry Entry;
        protected readonly Signal Signal;
        protected readonly ILogger Logger;
        protected readonly JoinDirection Direction;

        protected JoinBindingBase(IJoinEndpoint endpoint, JoinEntry entry, Signal signal, ILogger logger)
        {
            Endpoint = endpoint;
            Entry = entry;
            Signal = signal;
            Logger = logger;
            Direction = JoinDirectionParser.Parse(entry.Direction);
        }

        public abstract void Bind();
    }

    internal enum JoinDirection
    {
        Input,
        Output
    }

    internal static class JoinDirectionParser
    {
        public static JoinDirection Parse(string direction)
        {
            if (string.Equals(direction, "input", StringComparison.OrdinalIgnoreCase))
            {
                return JoinDirection.Input;
            }

            if (string.Equals(direction, "output", StringComparison.OrdinalIgnoreCase))
            {
                return JoinDirection.Output;
            }

            throw new ArgumentException("Invalid join direction: " + (direction ?? "null"), nameof(direction));
        }
    }
}
