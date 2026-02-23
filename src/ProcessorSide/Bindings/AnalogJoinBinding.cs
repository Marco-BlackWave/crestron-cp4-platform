using Crestron.SimplSharpPro.DeviceSupport;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;

namespace CrestronCP4.ProcessorSide.Bindings
{
    internal sealed class AnalogJoinBinding : JoinBindingBase
    {
        public AnalogJoinBinding(IJoinEndpoint endpoint, JoinEntry entry, Signal signal, ILogger logger)
            : base(endpoint, entry, signal, logger)
        {
        }

        public override void Bind()
        {
            if (Direction == JoinDirection.Input)
            {
                // "input" = device/panel sends TO the program
                // In Crestron: UShortOutput = device-to-program direction
                UShortOutput output = Endpoint.GetAnalogOutput(Entry.Join);
                if (output != null)
                {
                    // Sync initial value
                    Signal.Set(output.UShortValue);

                    output.SigChange += (sender, args) =>
                    {
                        Signal.Set(args.Sig.UShortValue);
                    };
                }
            }
            else
            {
                // "output" = program sends TO the device/panel
                // In Crestron: UShortInput = program-to-device direction
                UShortInput input = Endpoint.GetAnalogInput(Entry.Join);
                if (input != null)
                {
                    // Sync initial value
                    var current = Signal.Get();
                    if (current is ushort ushortVal)
                    {
                        input.UShortValue = ushortVal;
                    }

                    Signal.ValueChanged += (sender, args) =>
                    {
                        var value = args.Value is ushort ? (ushort)args.Value : (ushort)0;
                        input.UShortValue = value;
                    };
                }
            }
        }
    }
}
