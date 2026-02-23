using Crestron.SimplSharpPro.DeviceSupport;

namespace CrestronCP4.ProcessorSide.Bindings
{
    public interface IJoinEndpoint
    {
        BoolInput GetDigitalInput(ushort join);
        BoolOutput GetDigitalOutput(ushort join);
        UShortInput GetAnalogInput(ushort join);
        UShortOutput GetAnalogOutput(ushort join);
        StringInput GetSerialInput(ushort join);
        StringOutput GetSerialOutput(ushort join);
    }
}
