using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Devices;
using CrestronCP4.ProcessorSide.Devices.Drivers;
using CrestronCP4.ProcessorSide.Transport;

namespace CoreTests
{
    // Shared test helpers
    internal class TestLogger : ILogger
    {
        public List<string> Messages { get; } = new();
        public void Info(string message) => Messages.Add("[INFO] " + message);
        public void Warn(string message) => Messages.Add("[WARN] " + message);
        public void Error(string message) => Messages.Add("[ERROR] " + message);
    }

    internal class MockTransport : ITransport
    {
        public string Id => "mock";
        public bool IsConnected { get; private set; }
        public List<string> SentStrings { get; } = new();
        public List<byte[]> SentBytes { get; } = new();

        public event EventHandler<TransportDataEventArgs> DataReceived;

        public void Connect() => IsConnected = true;
        public void Disconnect() => IsConnected = false;
        public void Send(string data) => SentStrings.Add(data);
        public void Send(byte[] data) => SentBytes.Add(data);

        public void SimulateData(string data)
        {
            DataReceived?.Invoke(this, new TransportDataEventArgs(data));
        }

        public void SimulateData(byte[] data)
        {
            DataReceived?.Invoke(this, new TransportDataEventArgs(data));
        }

        public void Dispose() => Disconnect();
    }

    // Helper to build minimal DeviceProfile objects without serialization
    internal static class ProfileFactory
    {
        public static DeviceProfile CreateMatrix(int inputs, int outputs, string routeTemplate = null, string feedbackPattern = null)
        {
            return new DeviceProfile
            {
                Id = "test-matrix",
                Manufacturer = "Test",
                Model = "Matrix",
                Category = "matrix",
                Protocols = new ProtocolSet
                {
                    Ip = new IpProtocol
                    {
                        Port = 23,
                        Commands = new Dictionary<string, string>
                        {
                            ["route_1_1"] = "CI1O1\r",
                            ["route_2_1"] = "CI2O1\r",
                            ["mute_1"] = "CO1MT\r"
                        }
                    }
                },
                Capabilities = new DeviceCapabilities(),
                Matrix = new MatrixConfig
                {
                    Inputs = inputs,
                    Outputs = outputs,
                    RouteCommandTemplate = routeTemplate,
                    MuteCommandTemplate = null,
                    FeedbackPattern = feedbackPattern
                }
            };
        }

        public static DeviceProfile CreateDsp(string levelTemplate = null, string muteTemplate = null)
        {
            return new DeviceProfile
            {
                Id = "test-dsp",
                Manufacturer = "Test",
                Model = "DSP",
                Category = "dsp",
                Protocols = new ProtocolSet
                {
                    Ip = new IpProtocol
                    {
                        Port = 1023,
                        Commands = new Dictionary<string, string>()
                    }
                },
                Capabilities = new DeviceCapabilities(),
                Dsp = new DspConfig
                {
                    MaxChannels = 16,
                    LevelCommandTemplate = levelTemplate,
                    MuteCommandTemplate = muteTemplate,
                    SubscribeCommandTemplate = "SUB {channel}\r",
                    UnsubscribeCommandTemplate = "UNSUB {channel}\r"
                },
                FeedbackRules = new List<FeedbackRule>
                {
                    new FeedbackRule { Pattern = @"^MV(\d+)$", Signal = "volume", Transform = "parseInt" },
                    new FeedbackRule { Pattern = @"^PWON$", Signal = "power", Value = true },
                    new FeedbackRule { Pattern = @"^PWSTANDBY$", Signal = "power", Value = false }
                }
            };
        }

        public static DeviceProfile CreateMedia()
        {
            return new DeviceProfile
            {
                Id = "test-media",
                Manufacturer = "Test",
                Model = "Player",
                Category = "media",
                Protocols = new ProtocolSet
                {
                    Ir = new IrProtocol
                    {
                        Commands = new Dictionary<string, string>
                        {
                            ["play"] = "PLAY",
                            ["pause"] = "PAUSE",
                            ["stop"] = "STOP",
                            ["next"] = "NEXT",
                            ["previous"] = "PREV"
                        }
                    }
                },
                Capabilities = new DeviceCapabilities(),
                Media = new MediaConfig
                {
                    TransportCommands = new Dictionary<string, string>
                    {
                        ["play"] = "PLAY\r",
                        ["pause"] = "PAUSE\r",
                        ["stop"] = "STOP\r"
                    },
                    NowPlayingFeedback = new NowPlayingFeedback
                    {
                        TrackPattern = @"^TRACK:(.+)$",
                        ArtistPattern = @"^ARTIST:(.+)$"
                    }
                }
            };
        }

        public static DeviceProfile CreateProjector()
        {
            return new DeviceProfile
            {
                Id = "test-projector",
                Manufacturer = "Test",
                Model = "Projector",
                Category = "projector",
                Protocols = new ProtocolSet
                {
                    Serial = new SerialProtocol
                    {
                        BaudRate = 9600,
                        Commands = new Dictionary<string, string>
                        {
                            ["powerOn"] = "PWR ON\r",
                            ["powerOff"] = "PWR OFF\r",
                            ["freeze"] = "FREEZE ON\r",
                            ["blank"] = "BLANK ON\r",
                            ["input_hdmi1"] = "SOURCE 30\r",
                            ["input_hdmi2"] = "SOURCE 31\r"
                        },
                        Feedback = new Dictionary<string, FeedbackDef>
                        {
                            ["powerState"] = new FeedbackDef { On = "PWR=01", Off = "PWR=00" }
                        }
                    }
                },
                Capabilities = new DeviceCapabilities
                {
                    DiscretePower = true,
                    Feedback = true,
                    WarmupMs = 5000,
                    CooldownMs = 3000
                }
            };
        }

        public static DeviceProfile CreateGateway()
        {
            return new DeviceProfile
            {
                Id = "test-gateway",
                Manufacturer = "Test",
                Model = "Gateway",
                Category = "gateway",
                Protocols = new ProtocolSet
                {
                    Ip = new IpProtocol
                    {
                        Port = 3671,
                        Commands = new Dictionary<string, string>
                        {
                            ["switch"] = "SET {objectId} {value}\r",
                            ["poll"] = "GET {objectId}\r",
                            ["subscribe"] = "SUB {objectId}\r"
                        }
                    }
                },
                Capabilities = new DeviceCapabilities(),
                FeedbackRules = new List<FeedbackRule>
                {
                    new FeedbackRule { Pattern = @"^STATUS:(.+):(\w+)$", Signal = "status" }
                }
            };
        }
    }

    public class ProfileDrivenMatrixTests
    {
        [Fact]
        public void Constructor_SetsInputOutputCounts()
        {
            var profile = ProfileFactory.CreateMatrix(8, 4);
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            Assert.Equal(8, driver.InputCount);
            Assert.Equal(4, driver.OutputCount);
        }

        [Fact]
        public void Initialize_ConnectsTransport()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4);
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();

            driver.Initialize(transport);
            Assert.True(driver.IsOnline);
        }

        [Fact]
        public void Route_WithTemplate_SendsTemplatedCommand()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4, routeTemplate: "CI{input}O{output}\r");
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Route(2, 3);
            Assert.Contains("CI2O3\r", transport.SentStrings);
        }

        [Fact]
        public void Route_WithoutTemplate_UsesCommandLookup()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4);
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Route(1, 1);
            Assert.Contains("CI1O1\r", transport.SentStrings);
        }

        [Fact]
        public void Route_UpdatesCurrentRoute()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4, routeTemplate: "CI{input}O{output}\r");
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            driver.Initialize(new MockTransport());

            driver.Route(3, 2);
            Assert.Equal(3, driver.GetCurrentRoute(2));
        }

        [Fact]
        public void RouteAll_RoutesAllOutputs()
        {
            var profile = ProfileFactory.CreateMatrix(4, 2, routeTemplate: "CI{input}O{output}\r");
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.RouteAll(1);
            Assert.Equal(1, driver.GetCurrentRoute(1));
            Assert.Equal(1, driver.GetCurrentRoute(2));
            Assert.Equal(2, transport.SentStrings.Count);
        }

        [Fact]
        public void Mute_SetsRouteToZero()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4, routeTemplate: "CI{input}O{output}\r");
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            driver.Initialize(new MockTransport());

            driver.Route(3, 2);
            Assert.Equal(3, driver.GetCurrentRoute(2));

            driver.Mute(2);
            Assert.Equal(0, driver.GetCurrentRoute(2));
        }

        [Fact]
        public void Route_OutOfRange_Ignored()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4);
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Route(0, 1);  // invalid input
            driver.Route(1, 0);  // invalid output
            driver.Route(1, 5);  // output > max
            Assert.Empty(transport.SentStrings);
        }

        [Fact]
        public void FeedbackReceived_RaisedOnRoute()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4, routeTemplate: "CI{input}O{output}\r");
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            driver.Initialize(new MockTransport());

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => feedback = e;

            driver.Route(2, 1);
            Assert.NotNull(feedback);
            Assert.Equal("route_output1", feedback.Property);
            Assert.Equal(2, feedback.Value);
        }

        [Fact]
        public void FeedbackRegex_ParsesRoutingFeedback()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4, routeTemplate: "CI{input}O{output}\r", feedbackPattern: @"^Rx(\d+)Tx(\d+)$");
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => feedback = e;

            transport.SimulateData("Rx3Tx2");
            Assert.NotNull(feedback);
            Assert.Equal("route_output2", feedback.Property);
            Assert.Equal(3, feedback.Value);
            Assert.Equal(3, driver.GetCurrentRoute(2));
        }

        [Fact]
        public void Dispose_DisconnectsTransport()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4);
            var driver = new ProfileDrivenMatrix("mx1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Dispose();
            Assert.False(transport.IsConnected);
        }

        [Fact]
        public void NullArguments_ThrowsArgumentNull()
        {
            var profile = ProfileFactory.CreateMatrix(4, 4);
            Assert.Throws<ArgumentNullException>(() => new ProfileDrivenMatrix(null, profile, "tcp", new TestLogger()));
            Assert.Throws<ArgumentNullException>(() => new ProfileDrivenMatrix("mx1", null, "tcp", new TestLogger()));
            Assert.Throws<ArgumentNullException>(() => new ProfileDrivenMatrix("mx1", profile, "tcp", null));
        }
    }

    public class ProfileDrivenDspTests
    {
        [Fact]
        public void SetLevel_WithTemplate_SendsTemplatedCommand()
        {
            var profile = ProfileFactory.CreateDsp(levelTemplate: "SS {channel} {level}\r");
            var driver = new ProfileDrivenDsp("dsp1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SetLevel(1, 50);
            Assert.Contains("SS 1 50\r", transport.SentStrings);
            Assert.Equal(50, driver.GetLevel(1));
        }

        [Fact]
        public void SetMute_WithTemplate_SendsCorrectValue()
        {
            var profile = ProfileFactory.CreateDsp(muteTemplate: "SM {channel} {muted}\r");
            var driver = new ProfileDrivenDsp("dsp1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SetMute(1, true);
            Assert.Contains("SM 1 1\r", transport.SentStrings);

            transport.SentStrings.Clear();
            driver.SetMute(1, false);
            Assert.Contains("SM 1 0\r", transport.SentStrings);
        }

        [Fact]
        public void Subscribe_SendsCommand()
        {
            var profile = ProfileFactory.CreateDsp();
            var driver = new ProfileDrivenDsp("dsp1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Subscribe(5);
            Assert.Contains("SUB 5\r", transport.SentStrings);
        }

        [Fact]
        public void Unsubscribe_SendsCommand()
        {
            var profile = ProfileFactory.CreateDsp();
            var driver = new ProfileDrivenDsp("dsp1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Unsubscribe(5);
            Assert.Contains("UNSUB 5\r", transport.SentStrings);
        }

        [Fact]
        public void FeedbackRules_ParseVolume()
        {
            var profile = ProfileFactory.CreateDsp();
            var driver = new ProfileDrivenDsp("dsp1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => { if (e.Property == "volume") feedback = e; };

            transport.SimulateData("MV50");
            Assert.NotNull(feedback);
            Assert.Equal(50, feedback.Value);
        }

        [Fact]
        public void FeedbackRules_ParsePowerOn()
        {
            var profile = ProfileFactory.CreateDsp();
            var driver = new ProfileDrivenDsp("dsp1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => { if (e.Property == "power") feedback = e; };

            transport.SimulateData("PWON");
            Assert.NotNull(feedback);
            Assert.Equal(true, feedback.Value);
        }

        [Fact]
        public void FeedbackRules_ParsePowerOff()
        {
            var profile = ProfileFactory.CreateDsp();
            var driver = new ProfileDrivenDsp("dsp1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => { if (e.Property == "power") feedback = e; };

            transport.SimulateData("PWSTANDBY");
            Assert.NotNull(feedback);
            Assert.Equal(false, feedback.Value);
        }

        [Fact]
        public void GetLevel_Unset_ReturnsZero()
        {
            var profile = ProfileFactory.CreateDsp();
            var driver = new ProfileDrivenDsp("dsp1", profile, "tcp", new TestLogger());
            Assert.Equal(0, driver.GetLevel(99));
        }

        [Fact]
        public void Dispose_DisconnectsAndClearsSubscriptions()
        {
            var profile = ProfileFactory.CreateDsp();
            var driver = new ProfileDrivenDsp("dsp1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Subscribe(1);
            driver.Dispose();
            Assert.False(transport.IsConnected);
        }
    }

    public class ProfileDrivenMediaTests
    {
        [Fact]
        public void Play_SendsTransportCommand()
        {
            var profile = ProfileFactory.CreateMedia();
            var driver = new ProfileDrivenMedia("m1", profile, "ir", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Play();
            Assert.Contains("PLAY\r", transport.SentStrings);
            Assert.True(driver.IsPlaying);
        }

        [Fact]
        public void Pause_SetsIsPlayingFalse()
        {
            var profile = ProfileFactory.CreateMedia();
            var driver = new ProfileDrivenMedia("m1", profile, "ir", new TestLogger());
            driver.Initialize(new MockTransport());

            driver.Play();
            Assert.True(driver.IsPlaying);
            driver.Pause();
            Assert.False(driver.IsPlaying);
        }

        [Fact]
        public void Stop_ResetsPositionAndPlaying()
        {
            var profile = ProfileFactory.CreateMedia();
            var driver = new ProfileDrivenMedia("m1", profile, "ir", new TestLogger());
            driver.Initialize(new MockTransport());

            driver.Play();
            driver.Stop();
            Assert.False(driver.IsPlaying);
            Assert.Equal(0, driver.Position);
        }

        [Fact]
        public void NowPlayingFeedback_ParsesTrackAndArtist()
        {
            var profile = ProfileFactory.CreateMedia();
            var driver = new ProfileDrivenMedia("m1", profile, "ir", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            transport.SimulateData("TRACK:Bohemian Rhapsody");
            Assert.Equal("Bohemian Rhapsody", driver.TrackName);

            transport.SimulateData("ARTIST:Queen");
            Assert.Equal("Queen", driver.Artist);
        }

        [Fact]
        public void FeedbackReceived_RaisedOnPlay()
        {
            var profile = ProfileFactory.CreateMedia();
            var driver = new ProfileDrivenMedia("m1", profile, "ir", new TestLogger());
            driver.Initialize(new MockTransport());

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => feedback = e;

            driver.Play();
            Assert.NotNull(feedback);
            Assert.Equal("isPlaying", feedback.Property);
            Assert.Equal(true, feedback.Value);
        }
    }

    public class ProfileDrivenProjectorTests
    {
        [Fact]
        public void PowerOn_SendsCommand()
        {
            var profile = ProfileFactory.CreateProjector();
            var driver = new ProfileDrivenProjector("pj1", profile, "serial", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.PowerOn();
            Assert.Contains("PWR ON\r", transport.SentStrings);
            Assert.True(driver.IsPoweredOn);
        }

        [Fact]
        public void PowerOff_SendsCommand()
        {
            var profile = ProfileFactory.CreateProjector();
            var driver = new ProfileDrivenProjector("pj1", profile, "serial", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.PowerOff();
            Assert.Contains("PWR OFF\r", transport.SentStrings);
            Assert.False(driver.IsPoweredOn);
        }

        [Fact]
        public void SelectInput_SendsCommand()
        {
            var profile = ProfileFactory.CreateProjector();
            var driver = new ProfileDrivenProjector("pj1", profile, "serial", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SelectInput("hdmi1");
            Assert.Contains("SOURCE 30\r", transport.SentStrings);
        }

        [Fact]
        public void Freeze_SendsCommand()
        {
            var profile = ProfileFactory.CreateProjector();
            var driver = new ProfileDrivenProjector("pj1", profile, "serial", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Freeze();
            Assert.Contains("FREEZE ON\r", transport.SentStrings);
        }

        [Fact]
        public void Blank_SendsCommand()
        {
            var profile = ProfileFactory.CreateProjector();
            var driver = new ProfileDrivenProjector("pj1", profile, "serial", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Blank();
            Assert.Contains("BLANK ON\r", transport.SentStrings);
        }

        [Fact]
        public void LampHoursFeedback_Parsed()
        {
            var profile = ProfileFactory.CreateProjector();
            var driver = new ProfileDrivenProjector("pj1", profile, "serial", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            transport.SimulateData("LAMP=12345 0");
            Assert.Equal(12345, driver.LampHours);
        }

        [Fact]
        public void PowerFeedback_ParsedFromSerial()
        {
            var profile = ProfileFactory.CreateProjector();
            var driver = new ProfileDrivenProjector("pj1", profile, "serial", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            transport.SimulateData("PWR=01");
            Assert.True(driver.IsPoweredOn);

            transport.SimulateData("PWR=00");
            Assert.False(driver.IsPoweredOn);
        }
    }

    public class ProfileDrivenGatewayTests
    {
        [Fact]
        public void SendCommand_WithTemplate_SubstitutesPlaceholders()
        {
            var profile = ProfileFactory.CreateGateway();
            var driver = new ProfileDrivenGateway("gw1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SendCommand("1/1/1", "switch", "1");
            Assert.Contains("SET 1/1/1 1\r", transport.SentStrings);
        }

        [Fact]
        public void Poll_SendsCommand()
        {
            var profile = ProfileFactory.CreateGateway();
            var driver = new ProfileDrivenGateway("gw1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Poll("1/1/1");
            Assert.Contains("GET 1/1/1\r", transport.SentStrings);
        }

        [Fact]
        public void Subscribe_SendsCommand()
        {
            var profile = ProfileFactory.CreateGateway();
            var driver = new ProfileDrivenGateway("gw1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Subscribe("1/1/1");
            Assert.Contains("SUB 1/1/1\r", transport.SentStrings);
        }

        [Fact]
        public void SendCommand_NullObjectId_Ignored()
        {
            var profile = ProfileFactory.CreateGateway();
            var driver = new ProfileDrivenGateway("gw1", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SendCommand(null, "switch", "1");
            driver.SendCommand("", "switch", "1");
            Assert.Empty(transport.SentStrings);
        }

        [Fact]
        public void FeedbackReceived_RaisedOnCommand()
        {
            var profile = ProfileFactory.CreateGateway();
            var driver = new ProfileDrivenGateway("gw1", profile, "tcp", new TestLogger());
            driver.Initialize(new MockTransport());

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => feedback = e;

            driver.SendCommand("1/1/1", "switch", "1");
            Assert.NotNull(feedback);
            Assert.Equal("1/1/1:switch", feedback.Property);
        }
    }

    public class BssSoundwebDriverTests
    {
        [Fact]
        public void SetLevel_SendsBinaryFrame()
        {
            var driver = new BssSoundwebDriver("bss1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SetLevel(1, 50);
            Assert.Single(transport.SentBytes);
            var frame = transport.SentBytes[0];
            Assert.Equal(0x02, frame[0]); // STX
            Assert.Equal(0x8D, frame[1]); // MSG_SET_PERCENT
            Assert.Equal(0x03, frame[frame.Length - 1]); // ETX
        }

        [Fact]
        public void SetLevel_TracksLevel()
        {
            var driver = new BssSoundwebDriver("bss1", new TestLogger());
            driver.Initialize(new MockTransport());

            driver.SetLevel(5, 75);
            Assert.Equal(75, driver.GetLevel(5));
        }

        [Fact]
        public void SetMute_SendsBinaryFrame()
        {
            var driver = new BssSoundwebDriver("bss1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SetMute(1, true);
            Assert.Single(transport.SentBytes);
            var frame = transport.SentBytes[0];
            Assert.Equal(0x02, frame[0]); // STX
            Assert.Equal(0x88, frame[1]); // MSG_SET
        }

        [Fact]
        public void Subscribe_SendsSubscribeFrame()
        {
            var driver = new BssSoundwebDriver("bss1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Subscribe(1);
            Assert.Single(transport.SentBytes);
            Assert.Equal(0x89, transport.SentBytes[0][1]); // MSG_SUBSCRIBE
        }

        [Fact]
        public void Unsubscribe_SendsFrame()
        {
            var driver = new BssSoundwebDriver("bss1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Unsubscribe(1);
            Assert.Single(transport.SentBytes);
            Assert.Equal(0x8A, transport.SentBytes[0][1]); // MSG_UNSUBSCRIBE
        }

        [Fact]
        public void FeedbackReceived_RaisedOnSetLevel()
        {
            var driver = new BssSoundwebDriver("bss1", new TestLogger());
            driver.Initialize(new MockTransport());

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => feedback = e;

            driver.SetLevel(1, 50);
            Assert.NotNull(feedback);
            Assert.Equal("level_ch1", feedback.Property);
            Assert.Equal(50, feedback.Value);
        }

        [Fact]
        public void GetLevel_Unset_ReturnsZero()
        {
            var driver = new BssSoundwebDriver("bss1", new TestLogger());
            Assert.Equal(0, driver.GetLevel(99));
        }

        [Fact]
        public void NullArguments_ThrowsArgumentNull()
        {
            Assert.Throws<ArgumentNullException>(() => new BssSoundwebDriver(null, new TestLogger()));
            Assert.Throws<ArgumentNullException>(() => new BssSoundwebDriver("id", null));
        }
    }

    public class ShellyDriverTests
    {
        [Fact]
        public void SendCommand_Relay_BuildsCorrectPath()
        {
            var driver = new ShellyDriver("sh1", "192.168.1.100", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SendCommand("0", "relay", "on");
            var sent = transport.SentStrings[0];
            Assert.Contains("GET /relay/0?turn=on HTTP/1.1", sent);
            Assert.Contains("Host: 192.168.1.100", sent);
        }

        [Fact]
        public void SendCommand_Dimmer_BuildsCorrectPath()
        {
            var driver = new ShellyDriver("sh1", "192.168.1.100", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SendCommand("0", "dimmer", "75");
            Assert.Contains("/light/0?brightness=75", transport.SentStrings[0]);
        }

        [Fact]
        public void SendCommand_Roller_BuildsCorrectPath()
        {
            var driver = new ShellyDriver("sh1", "192.168.1.100", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.SendCommand("0", "roller", "open");
            Assert.Contains("/roller/0?go=open", transport.SentStrings[0]);
        }

        [Fact]
        public void Poll_SendsStatusRequest()
        {
            var driver = new ShellyDriver("sh1", "192.168.1.100", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            driver.Poll("0");
            Assert.Contains("GET /status HTTP/1.1", transport.SentStrings[0]);
        }

        [Fact]
        public void FeedbackParsing_RelayState()
        {
            var driver = new ShellyDriver("sh1", "192.168.1.100", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => { if (e.Property == "relayState") feedback = e; };

            transport.SimulateData("HTTP/1.1 200 OK\r\n\r\n{\"ison\":true}");
            Assert.NotNull(feedback);
            Assert.Equal(true, feedback.Value);
        }

        [Fact]
        public void FeedbackParsing_Brightness()
        {
            var driver = new ShellyDriver("sh1", "192.168.1.100", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            DeviceFeedbackEventArgs feedback = null;
            driver.FeedbackReceived += (_, e) => { if (e.Property == "brightness") feedback = e; };

            transport.SimulateData("HTTP/1.1 200 OK\r\n\r\n{\"brightness\":75}");
            Assert.NotNull(feedback);
            Assert.Equal(75, feedback.Value);
        }
    }

    public class ElkM1DriverTests
    {
        [Fact]
        public void ArmAway_SendsCorrectCommand()
        {
            var driver = new ElkM1Driver("elk1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            // Clear the initial StatusRequest commands
            transport.SentStrings.Clear();

            driver.ArmAway();
            Assert.NotEmpty(transport.SentStrings);
            var sent = transport.SentStrings[0];
            Assert.Contains("a1", sent);
        }

        [Fact]
        public void ArmStay_SendsCorrectCommand()
        {
            var driver = new ElkM1Driver("elk1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);
            transport.SentStrings.Clear();

            driver.ArmStay();
            Assert.Contains("a2", transport.SentStrings[0]);
        }

        [Fact]
        public void Disarm_PadsCodeTo6Digits()
        {
            var driver = new ElkM1Driver("elk1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);
            transport.SentStrings.Clear();

            driver.Disarm("1234");
            Assert.Contains("a0", transport.SentStrings[0]);
            Assert.Contains("1234", transport.SentStrings[0]);
        }

        [Fact]
        public void Disarm_NullCode_Ignored()
        {
            var driver = new ElkM1Driver("elk1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);
            transport.SentStrings.Clear();

            driver.Disarm(null);
            Assert.Empty(transport.SentStrings);
        }

        [Fact]
        public void Initialize_SendsStatusRequest()
        {
            var driver = new ElkM1Driver("elk1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            // Should send zone status and arming status requests
            Assert.True(transport.SentStrings.Count >= 2);
        }

        [Fact]
        public void ZoneCount_Returns208()
        {
            var driver = new ElkM1Driver("elk1", new TestLogger());
            Assert.Equal(208, driver.ZoneCount);
        }

        [Fact]
        public void IsZoneOpen_OutOfRange_ReturnsFalse()
        {
            var driver = new ElkM1Driver("elk1", new TestLogger());
            Assert.False(driver.IsZoneOpen(0));
            Assert.False(driver.IsZoneOpen(209));
        }

        [Fact]
        public void DefaultState_Disarmed()
        {
            var driver = new ElkM1Driver("elk1", new TestLogger());
            Assert.Equal("Disarmed", driver.ArmMode);
            Assert.False(driver.IsAlarmActive);
            Assert.True(driver.IsReady);
        }

        [Fact]
        public void ArmingStatusParsing_SetsArmMode()
        {
            var driver = new ElkM1Driver("elk1", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            // Simulate arming status reply: [len]AS[area_status_8]...
            // Format: "xxAS1xxxxxxx..." where area1 = '1' = ArmedAway
            var response = "16AS100000001111111100";
            transport.SimulateData(response);
            Assert.Equal("ArmedAway", driver.ArmMode);
        }

        [Fact]
        public void NullArguments_ThrowsArgumentNull()
        {
            Assert.Throws<ArgumentNullException>(() => new ElkM1Driver(null, new TestLogger()));
            Assert.Throws<ArgumentNullException>(() => new ElkM1Driver("elk1", null));
        }
    }
}
