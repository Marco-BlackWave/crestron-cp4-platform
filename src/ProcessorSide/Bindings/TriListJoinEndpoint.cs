using System;
using Crestron.SimplSharpPro.DeviceSupport;

namespace CrestronCP4.ProcessorSide.Bindings
{
    public sealed class TriListJoinEndpoint : IJoinEndpoint
    {
        private readonly BasicTriList _triList;

        public TriListJoinEndpoint(BasicTriList triList)
        {
            _triList = triList ?? throw new ArgumentNullException(nameof(triList));
        }

        public BasicTriList Device => _triList;

        public BoolInput GetDigitalInput(ushort join)
        {
            return _triList.BooleanInput[join];
        }

        public BoolOutput GetDigitalOutput(ushort join)
        {
            return _triList.BooleanOutput[join];
        }

        public UShortInput GetAnalogInput(ushort join)
        {
            return _triList.UShortInput[join];
        }

        public UShortOutput GetAnalogOutput(ushort join)
        {
            return _triList.UShortOutput[join];
        }

        public StringInput GetSerialInput(ushort join)
        {
            return _triList.StringInput[join];
        }

        public StringOutput GetSerialOutput(ushort join)
        {
            return _triList.StringOutput[join];
        }
    }
}
