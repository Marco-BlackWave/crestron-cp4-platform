using Crestron.SimplSharpPro.DeviceSupport;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Bindings
{
    internal sealed class SerialJoinBinding : JoinBindingBase
    {
        public SerialJoinBinding(IJoinEndpoint endpoint, JoinEntry entry, Signal signal, ILogger logger)
            : base(endpoint, entry, signal, logger)
        {
        }

        public override void Bind()
        {
            if (Direction == JoinDirection.Input)
            {
                // "input" = device/panel sends TO the program
                // In Crestron: StringOutput = device-to-program direction
                StringOutput output = Endpoint.GetSerialOutput(Entry.Join);
                if (output != null)
                {
                    // Sync initial value
                    Signal.Set(output.StringValue);

                    output.SigChange += (sender, args) =>
                    {
                        Signal.Set(args.Sig.StringValue);
                    };
                }
            }
            else
            {
                // "output" = program sends TO the device/panel
                // In Crestron: StringInput = program-to-device direction
                StringInput input = Endpoint.GetSerialInput(Entry.Join);
                if (input != null)
                {
                    // Sync initial value
                    var current = Signal.Get();
                    if (current is string strVal)
                    {
                        input.StringValue = strVal;
                    }

                    Signal.ValueChanged += (sender, args) =>
                    {
                        var value = args.Value as string ?? string.Empty;
                        input.StringValue = value;
                    };
                }
            }
        }
    }
}
