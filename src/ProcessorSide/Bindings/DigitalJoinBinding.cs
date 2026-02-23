using Crestron.SimplSharpPro.DeviceSupport;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Bindings
{
    internal sealed class DigitalJoinBinding : JoinBindingBase
    {
        public DigitalJoinBinding(IJoinEndpoint endpoint, JoinEntry entry, Signal signal, ILogger logger)
            : base(endpoint, entry, signal, logger)
        {
        }

        public override void Bind()
        {
            if (Direction == JoinDirection.Input)
            {
                // "input" = device/panel sends TO the program
                // In Crestron: BooleanOutput = device-to-program direction
                BoolOutput output = Endpoint.GetDigitalOutput(Entry.Join);
                if (output != null)
                {
                    // Sync initial value
                    Signal.Set(output.BoolValue);

                    output.SigChange += (sender, args) =>
                    {
                        Signal.Set(args.Sig.BoolValue);
                    };
                }
            }
            else
            {
                // "output" = program sends TO the device/panel
                // In Crestron: BooleanInput = program-to-device direction
                BoolInput input = Endpoint.GetDigitalInput(Entry.Join);
                if (input != null)
                {
                    // Sync initial value
                    var current = Signal.Get();
                    if (current is bool boolVal)
                    {
                        input.BoolValue = boolVal;
                    }

                    Signal.ValueChanged += (sender, args) =>
                    {
                        var value = args.Value is bool ? (bool)args.Value : false;
                        input.BoolValue = value;
                    };
                }
            }
        }
    }
}
