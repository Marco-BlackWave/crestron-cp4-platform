using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Devices;
using CrestronCP4.ProcessorSide.Devices.Drivers;
using CrestronCP4.ProcessorSide.Infrastructure;
using CrestronCP4.ProcessorSide.Transport;

namespace CoreTests
{
    /// <summary>
    /// Integration tests that wire a real device profile through the full pipeline:
    /// JSON profile → DeviceProfileLoader → Driver creation → Transport → Command sending → Feedback parsing
    /// </summary>
    public class IntegrationTests
    {
        private class TestFileSystem : IFileSystem
        {
            private readonly Dictionary<string, string> _files = new();
            public void AddFile(string path, string content) => _files[path] = content;
            public bool FileExists(string path) => _files.ContainsKey(path);
            public string ReadAllText(string path) => _files[path];
        }

        #region Matrix Integration

        private const string ExtronMatrixProfileJson = @"{
            ""id"": ""extron-crosspoint-8x8"",
            ""manufacturer"": ""Extron"",
            ""model"": ""CrossPoint 84"",
            ""category"": ""matrix"",
            ""protocols"": {
                ""serial"": {
                    ""baudRate"": 9600,
                    ""dataBits"": 8,
                    ""parity"": ""none"",
                    ""stopBits"": 1,
                    ""commands"": {}
                }
            },
            ""capabilities"": {
                ""discretePower"": false,
                ""volumeControl"": false,
                ""inputSelect"": false,
                ""feedback"": true
            },
            ""matrix"": {
                ""inputs"": 8,
                ""outputs"": 8,
                ""routeCommandTemplate"": ""{input}*{output}!"",
                ""muteCommandTemplate"": ""0*{output}!"",
                ""feedbackPattern"": ""^Out(\\d+) In(\\d+)$""
            }
        }";

        [Fact]
        public void Matrix_FullPipeline_LoadProfile_CreateDriver_Route_Feedback()
        {
            // Step 1: Load profile from JSON
            var fs = new TestFileSystem();
            fs.AddFile("/extron.json", ExtronMatrixProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());
            loader.LoadProfile("/extron.json");

            var profile = loader.GetProfile("extron-crosspoint-8x8");
            Assert.NotNull(profile);
            Assert.Equal("matrix", profile.Category);
            Assert.Equal(8, profile.Matrix.Inputs);

            // Step 2: Create driver from profile
            var driver = new ProfileDrivenMatrix("mx-lobby", profile, "serial", new TestLogger());
            Assert.Equal(8, driver.InputCount);
            Assert.Equal(8, driver.OutputCount);

            // Step 3: Wire up transport
            var transport = new MockTransport();
            driver.Initialize(transport);
            Assert.True(driver.IsOnline);

            // Step 4: Route input 3 to output 5
            driver.Route(3, 5);
            Assert.Single(transport.SentStrings);
            Assert.Equal("3*5!", transport.SentStrings[0]);
            Assert.Equal(3, driver.GetCurrentRoute(5));

            // Step 5: Mute output 5
            driver.Mute(5);
            Assert.Equal("0*5!", transport.SentStrings[1]);
            Assert.Equal(0, driver.GetCurrentRoute(5));

            // Step 6: Simulate routing feedback from device
            var feedbackEvents = new List<DeviceFeedbackEventArgs>();
            driver.FeedbackReceived += (_, e) => feedbackEvents.Add(e);

            // Driver reads group1=input, group2=output, so "Out2 In4" → input=2, output=4
            transport.SimulateData("Out2 In4");
            Assert.Equal(2, driver.GetCurrentRoute(4));
            Assert.Contains(feedbackEvents, e => e.Property == "route_output4" && (int)e.Value == 2);

            // Step 7: Route all
            transport.SentStrings.Clear();
            driver.RouteAll(1);
            Assert.Equal(8, transport.SentStrings.Count); // One per output

            driver.Dispose();
            Assert.False(transport.IsConnected);
        }

        #endregion

        #region DSP Integration

        private const string BiampDspProfileJson = @"{
            ""id"": ""biamp-tesira"",
            ""manufacturer"": ""Biamp"",
            ""model"": ""TesiraFORTE"",
            ""category"": ""dsp"",
            ""protocols"": {
                ""ip"": {
                    ""port"": 23,
                    ""type"": ""tcp"",
                    ""commands"": {}
                }
            },
            ""capabilities"": {
                ""discretePower"": false,
                ""volumeControl"": true,
                ""inputSelect"": false,
                ""feedback"": true
            },
            ""dsp"": {
                ""maxChannels"": 32,
                ""levelCommandTemplate"": ""DEVICE set 1 inputLevel {channel} {level}\r"",
                ""muteCommandTemplate"": ""DEVICE set 1 inputMute {channel} {muted}\r"",
                ""subscribeCommandTemplate"": ""DEVICE subscribe 1 inputLevel {channel}\r""
            },
            ""feedbackRules"": [
                { ""pattern"": ""^\\+OK value:([-]?\\d+)"", ""signal"": ""level"", ""transform"": ""parseInt"" }
            ]
        }";

        [Fact]
        public void Dsp_FullPipeline_LoadProfile_SetLevel_Subscribe()
        {
            // Step 1: Load profile
            var fs = new TestFileSystem();
            fs.AddFile("/biamp.json", BiampDspProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());
            loader.LoadProfile("/biamp.json");

            var profile = loader.GetProfile("biamp-tesira");
            Assert.NotNull(profile);
            Assert.NotNull(profile.Dsp);
            Assert.Equal(32, profile.Dsp.MaxChannels);

            // Step 2: Create and initialize driver
            var driver = new ProfileDrivenDsp("dsp-lobby", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            // Step 3: Set level
            driver.SetLevel(1, -20);
            Assert.Contains("DEVICE set 1 inputLevel 1 -20\r", transport.SentStrings);
            Assert.Equal(-20, driver.GetLevel(1));

            // Step 4: Set mute
            driver.SetMute(1, true);
            Assert.Contains("DEVICE set 1 inputMute 1 1\r", transport.SentStrings);

            // Step 5: Subscribe
            driver.Subscribe(1);
            Assert.Contains("DEVICE subscribe 1 inputLevel 1\r", transport.SentStrings);

            // Step 6: Verify feedback events
            var feedbackEvents = new List<DeviceFeedbackEventArgs>();
            driver.FeedbackReceived += (_, e) => feedbackEvents.Add(e);

            driver.SetLevel(2, 50);
            Assert.Contains(feedbackEvents, e => e.Property == "level_ch2");

            driver.Dispose();
        }

        #endregion

        #region Media Integration

        private const string AppleTvProfileJson = @"{
            ""id"": ""apple-tv-4k"",
            ""manufacturer"": ""Apple"",
            ""model"": ""TV 4K"",
            ""category"": ""media"",
            ""protocols"": {
                ""ir"": {
                    ""driverFile"": ""Apple_TV.ir"",
                    ""commands"": {
                        ""menu"": ""MENU"",
                        ""select"": ""SELECT"",
                        ""up"": ""UP"",
                        ""down"": ""DOWN""
                    }
                }
            },
            ""capabilities"": {
                ""discretePower"": false,
                ""volumeControl"": false,
                ""inputSelect"": false,
                ""feedback"": false
            },
            ""media"": {
                ""transportCommands"": {
                    ""play"": ""PLAY"",
                    ""pause"": ""PAUSE"",
                    ""stop"": ""STOP"",
                    ""next"": ""SKIP_FWD"",
                    ""previous"": ""SKIP_REV""
                },
                ""nowPlayingFeedback"": {
                    ""trackPattern"": ""^TITLE:(.+)$"",
                    ""artistPattern"": ""^ARTIST:(.+)$""
                }
            }
        }";

        [Fact]
        public void Media_FullPipeline_LoadProfile_PlayPause_NowPlaying()
        {
            // Step 1: Load
            var fs = new TestFileSystem();
            fs.AddFile("/atv.json", AppleTvProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());
            loader.LoadProfile("/atv.json");

            var profile = loader.GetProfile("apple-tv-4k");
            Assert.NotNull(profile);
            Assert.NotNull(profile.Media);

            // Step 2: Create driver
            var driver = new ProfileDrivenMedia("atv-living", profile, "ir", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            // Step 3: Play
            driver.Play();
            Assert.Contains("PLAY", transport.SentStrings);
            Assert.True(driver.IsPlaying);

            // Step 4: Pause
            driver.Pause();
            Assert.Contains("PAUSE", transport.SentStrings);
            Assert.False(driver.IsPlaying);

            // Step 5: Now playing feedback
            transport.SimulateData("TITLE:Come Together");
            Assert.Equal("Come Together", driver.TrackName);

            transport.SimulateData("ARTIST:The Beatles");
            Assert.Equal("The Beatles", driver.Artist);

            driver.Dispose();
        }

        #endregion

        #region Projector Integration

        private const string EpsonProjectorProfileJson = @"{
            ""id"": ""epson-eb-l200f"",
            ""manufacturer"": ""Epson"",
            ""model"": ""EB-L200F"",
            ""category"": ""projector"",
            ""protocols"": {
                ""serial"": {
                    ""baudRate"": 9600,
                    ""dataBits"": 8,
                    ""parity"": ""none"",
                    ""stopBits"": 1,
                    ""commands"": {
                        ""powerOn"": ""PWR ON\r"",
                        ""powerOff"": ""PWR OFF\r"",
                        ""input_hdmi1"": ""SOURCE 30\r"",
                        ""input_hdmi2"": ""SOURCE A0\r"",
                        ""freeze"": ""FREEZE ON\r"",
                        ""blank"": ""MUTE ON\r""
                    },
                    ""feedback"": {
                        ""powerState"": { ""poll"": ""PWR?\r"", ""on"": ""PWR=01"", ""off"": ""PWR=00"" }
                    }
                }
            },
            ""capabilities"": {
                ""discretePower"": true,
                ""volumeControl"": false,
                ""inputSelect"": true,
                ""feedback"": true,
                ""warmupMs"": 30000,
                ""cooldownMs"": 15000
            }
        }";

        [Fact]
        public void Projector_FullPipeline_PowerOn_SelectInput_LampFeedback()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/epson.json", EpsonProjectorProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());
            loader.LoadProfile("/epson.json");

            var profile = loader.GetProfile("epson-eb-l200f");
            Assert.NotNull(profile);
            Assert.True(profile.Capabilities.DiscretePower);
            Assert.Equal(30000, profile.Capabilities.WarmupMs);

            var driver = new ProfileDrivenProjector("proj-conf", profile, "serial", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            // Power on
            driver.PowerOn();
            Assert.Contains("PWR ON\r", transport.SentStrings);
            Assert.True(driver.IsPoweredOn);

            // Select input
            driver.SelectInput("hdmi1");
            Assert.Contains("SOURCE 30\r", transport.SentStrings);

            // Freeze and blank
            driver.Freeze();
            Assert.Contains("FREEZE ON\r", transport.SentStrings);
            driver.Blank();
            Assert.Contains("MUTE ON\r", transport.SentStrings);

            // Lamp hours feedback
            transport.SimulateData("LAMP=5432 0");
            Assert.Equal(5432, driver.LampHours);

            // Power feedback
            transport.SimulateData("PWR=01");
            Assert.True(driver.IsPoweredOn);
            transport.SimulateData("PWR=00");
            Assert.False(driver.IsPoweredOn);

            driver.Dispose();
        }

        #endregion

        #region Gateway Integration

        private const string KnxGatewayProfileJson = @"{
            ""id"": ""knx-ip-gateway"",
            ""manufacturer"": ""KNX"",
            ""model"": ""IP Gateway"",
            ""category"": ""gateway"",
            ""protocols"": {
                ""ip"": {
                    ""port"": 3671,
                    ""type"": ""tcp"",
                    ""commands"": {
                        ""switch"": ""GW {objectId} {value}\r"",
                        ""dimmer"": ""DIM {objectId} {value}\r"",
                        ""subscribe"": ""SUB {objectId}\r"",
                        ""poll"": ""READ {objectId}\r""
                    }
                }
            },
            ""capabilities"": {
                ""discretePower"": false,
                ""volumeControl"": false,
                ""inputSelect"": false,
                ""feedback"": true
            },
            ""gateway"": {
                ""objects"": [
                    { ""id"": ""1/1/1"", ""name"": ""Living Light"", ""type"": ""switch"", ""dataType"": ""1bit"" },
                    { ""id"": ""1/1/2"", ""name"": ""Living Dimmer"", ""type"": ""dimmer"", ""dataType"": ""8bit"" }
                ]
            },
            ""feedbackRules"": [
                { ""pattern"": ""^FB:(\\S+):(\\w+)$"", ""signal"": ""objectStatus"" }
            ]
        }";

        [Fact]
        public void Gateway_FullPipeline_SendCommand_Subscribe_Poll()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/knx.json", KnxGatewayProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());
            loader.LoadProfile("/knx.json");

            var profile = loader.GetProfile("knx-ip-gateway");
            Assert.NotNull(profile);
            Assert.NotNull(profile.Gateway);
            Assert.Equal(2, profile.Gateway.Objects.Count);

            var driver = new ProfileDrivenGateway("knx-main", profile, "tcp", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            // Switch on
            driver.SendCommand("1/1/1", "switch", "1");
            Assert.Contains("GW 1/1/1 1\r", transport.SentStrings);

            // Dim
            driver.SendCommand("1/1/2", "dimmer", "128");
            Assert.Contains("DIM 1/1/2 128\r", transport.SentStrings);

            // Subscribe
            driver.Subscribe("1/1/1");
            Assert.Contains("SUB 1/1/1\r", transport.SentStrings);

            // Poll
            driver.Poll("1/1/2");
            Assert.Contains("READ 1/1/2\r", transport.SentStrings);

            driver.Dispose();
        }

        #endregion

        #region Security Integration (Elk M1)

        [Fact]
        public void ElkM1_FullPipeline_ArmDisarm_ZoneFeedback()
        {
            var driver = new ElkM1Driver("elk-main", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            Assert.True(driver.IsOnline);
            Assert.Equal("Disarmed", driver.ArmMode);

            // Clear initial status requests
            transport.SentStrings.Clear();

            // Arm away
            driver.ArmAway();
            Assert.NotEmpty(transport.SentStrings);

            // Zone change feedback (zone 5 opens)
            var feedbackEvents = new List<DeviceFeedbackEventArgs>();
            driver.FeedbackReceived += (_, e) => feedbackEvents.Add(e);

            // Simulate zone change: [len]ZC[zone3][status1][checksum]
            // Zone 005, status 1 (open)
            transport.SimulateData("08ZC0051CC");
            Assert.True(driver.IsZoneOpen(5));
            Assert.Contains(feedbackEvents, e => e.Property == "zone_5" && (bool)e.Value == true);

            driver.Dispose();
        }

        #endregion

        #region BSS Soundweb Integration

        [Fact]
        public void BssSoundweb_FullPipeline_SetLevel_HiQnetFrame()
        {
            var driver = new BssSoundwebDriver("bss-main", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            // Set level on channel 1
            driver.SetLevel(1, 75);
            Assert.Single(transport.SentBytes);

            // Verify HiQnet frame structure
            var frame = transport.SentBytes[0];
            Assert.Equal(0x02, frame[0]); // STX
            Assert.Equal(0x8D, frame[1]); // MSG_SET_PERCENT
            Assert.Equal(0x03, frame[frame.Length - 1]); // ETX
            Assert.Equal(75, driver.GetLevel(1));

            // Subscribe
            driver.Subscribe(1);
            Assert.Equal(2, transport.SentBytes.Count);
            Assert.Equal(0x89, transport.SentBytes[1][1]); // MSG_SUBSCRIBE

            driver.Dispose();
        }

        #endregion

        #region Shelly Integration

        [Fact]
        public void Shelly_FullPipeline_Relay_Dimmer_Feedback()
        {
            var driver = new ShellyDriver("shelly-1", "192.168.1.50", new TestLogger());
            var transport = new MockTransport();
            driver.Initialize(transport);

            // Relay ON
            driver.SendCommand("0", "relay", "on");
            Assert.Contains("GET /relay/0?turn=on HTTP/1.1", transport.SentStrings[0]);
            Assert.Contains("Host: 192.168.1.50", transport.SentStrings[0]);

            // Dimmer
            driver.SendCommand("0", "dimmer", "50");
            Assert.Contains("/light/0?brightness=50", transport.SentStrings[1]);

            // Feedback parsing
            var feedbackEvents = new List<DeviceFeedbackEventArgs>();
            driver.FeedbackReceived += (_, e) => feedbackEvents.Add(e);

            transport.SimulateData("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"ison\":true,\"brightness\":50,\"power\":12}");
            Assert.Contains(feedbackEvents, e => e.Property == "relayState" && (bool)e.Value == true);
            Assert.Contains(feedbackEvents, e => e.Property == "brightness" && (int)e.Value == 50);
            Assert.Contains(feedbackEvents, e => e.Property == "power" && (int)e.Value == 12);

            driver.Dispose();
        }

        #endregion

        #region Multi-Profile DeviceProfileLoader Integration

        [Fact]
        public void DeviceProfileLoader_MultiCategory_AllProfilesAccessible()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/devices/matrix.json", ExtronMatrixProfileJson);
            fs.AddFile("/devices/dsp.json", BiampDspProfileJson);
            fs.AddFile("/devices/media.json", AppleTvProfileJson);
            fs.AddFile("/devices/projector.json", EpsonProjectorProfileJson);
            fs.AddFile("/devices/gateway.json", KnxGatewayProfileJson);

            var loader = new DeviceProfileLoader(fs, new TestLogger());
            loader.LoadProfile("/devices/matrix.json");
            loader.LoadProfile("/devices/dsp.json");
            loader.LoadProfile("/devices/media.json");
            loader.LoadProfile("/devices/projector.json");
            loader.LoadProfile("/devices/gateway.json");

            Assert.Equal(5, loader.AllProfiles.Count());
            Assert.NotNull(loader.GetProfile("extron-crosspoint-8x8"));
            Assert.NotNull(loader.GetProfile("biamp-tesira"));
            Assert.NotNull(loader.GetProfile("apple-tv-4k"));
            Assert.NotNull(loader.GetProfile("epson-eb-l200f"));
            Assert.NotNull(loader.GetProfile("knx-ip-gateway"));

            // Verify each profile has correct category
            Assert.Equal("matrix", loader.GetProfile("extron-crosspoint-8x8")!.Category);
            Assert.Equal("dsp", loader.GetProfile("biamp-tesira")!.Category);
            Assert.Equal("media", loader.GetProfile("apple-tv-4k")!.Category);
            Assert.Equal("projector", loader.GetProfile("epson-eb-l200f")!.Category);
            Assert.Equal("gateway", loader.GetProfile("knx-ip-gateway")!.Category);
        }

        #endregion
    }
}
