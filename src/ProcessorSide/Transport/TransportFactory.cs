using System;
using Crestron.SimplSharpPro;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Transport
{
    /// <summary>
    /// Creates ITransport instances from device assignment config.
    /// Requires a reference to the CrestronControlSystem for hardware port access.
    /// </summary>
    public sealed class TransportFactory
    {
        private readonly CrestronControlSystem _processor;
        private readonly ILogger _logger;

        public TransportFactory(CrestronControlSystem processor, ILogger logger)
        {
            _processor = processor ?? throw new ArgumentNullException(nameof(processor));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public ITransport Create(string transportId, DeviceAssignment assignment)
        {
            if (assignment == null) throw new ArgumentNullException(nameof(assignment));

            var protocol = (assignment.Protocol ?? "").ToLowerInvariant();

            switch (protocol)
            {
                case "ir":
                    return CreateIrTransport(transportId, assignment);

                case "serial":
                    return CreateSerialTransport(transportId, assignment);

                case "ip":
                case "tcp":
                    return CreateTcpTransport(transportId, assignment);

                case "udp":
                    return CreateUdpTransport(transportId, assignment);

                case "bacnet":
                    return CreateTcpTransport(transportId + "-bacnet", new DeviceAssignment
                    {
                        Address = assignment.Address ?? "127.0.0.1",
                        Protocol = "tcp"
                    });

                case "modbus":
                    return CreateTcpTransport(transportId + "-modbus", new DeviceAssignment
                    {
                        Address = assignment.Address ?? "127.0.0.1",
                        Protocol = "tcp"
                    });

                case "knx":
                    // KNX/IP tunneling uses TCP on port 3671
                    return CreateTcpTransport(transportId + "-knx", new DeviceAssignment
                    {
                        Address = (assignment.Address ?? "127.0.0.1") + ":3671",
                        Protocol = "tcp"
                    });

                case "artnet":
                    // Art-Net uses UDP on port 6454
                    return CreateUdpTransport(transportId + "-artnet", new DeviceAssignment
                    {
                        Address = (assignment.Address ?? "255.255.255.255") + ":6454",
                        Protocol = "udp"
                    });

                case "shelly":
                    // Shelly REST API over HTTP on port 80
                    return CreateTcpTransport(transportId + "-shelly", new DeviceAssignment
                    {
                        Address = (assignment.Address ?? "127.0.0.1") + ":80",
                        Protocol = "tcp"
                    });

                case "pjlink":
                    // PJLink projector protocol on port 4352
                    return CreateTcpTransport(transportId + "-pjlink", new DeviceAssignment
                    {
                        Address = (assignment.Address ?? "127.0.0.1") + ":4352",
                        Protocol = "tcp"
                    });

                default:
                    throw new InvalidOperationException("Unknown protocol: " + assignment.Protocol);
            }
        }

        private IrTransport CreateIrTransport(string id, DeviceAssignment assignment)
        {
            var portIndex = ParsePortIndex(assignment.Port, "IR-");
            var irPort = _processor.IROutputPorts[portIndex];
            return new IrTransport(id, irPort, _logger);
        }

        private SerialTransport CreateSerialTransport(string id, DeviceAssignment assignment)
        {
            var portIndex = ParsePortIndex(assignment.Port, "COM-");
            var comPort = _processor.ComPorts[portIndex];

            var spec = new ComPort.ComPortSpec
            {
                BaudRate = ComPort.eComBaudRates.ComspecBaudRate9600,
                DataBits = ComPort.eComDataBits.ComspecDataBits8,
                Parity = ComPort.eComParityType.ComspecParityNone,
                StopBits = ComPort.eComStopBits.ComspecStopBits1,
                HardwareHandShake = ComPort.eComHardwareHandshakeType.ComspecHardwareHandshakeNone,
                SoftwareHandshake = ComPort.eComSoftwareHandshakeType.ComspecSoftwareHandshakeNone
            };

            return new SerialTransport(id, comPort, spec, _logger);
        }

        private TcpTransport CreateTcpTransport(string id, DeviceAssignment assignment)
        {
            var address = assignment.Address ?? "127.0.0.1";
            var port = 23; // Default telnet port for most AV devices

            // Parse "address:port" format if present
            if (address.Contains(":"))
            {
                var parts = address.Split(':');
                address = parts[0];
                int.TryParse(parts[1], out port);
            }

            return new TcpTransport(id, address, port, _logger);
        }

        private UdpTransport CreateUdpTransport(string id, DeviceAssignment assignment)
        {
            var address = assignment.Address ?? "127.0.0.1";
            var remotePort = 47808; // BACnet default
            var localPort = 47808;

            if (address.Contains(":"))
            {
                var parts = address.Split(':');
                address = parts[0];
                int.TryParse(parts[1], out remotePort);
            }

            return new UdpTransport(id, address, remotePort, localPort, _logger);
        }

        private static uint ParsePortIndex(string portString, string prefix)
        {
            if (string.IsNullOrWhiteSpace(portString))
            {
                return 1;
            }

            if (portString.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                var indexStr = portString.Substring(prefix.Length);
                if (uint.TryParse(indexStr, out uint index))
                {
                    return index;
                }
            }

            return 1;
        }
    }
}
