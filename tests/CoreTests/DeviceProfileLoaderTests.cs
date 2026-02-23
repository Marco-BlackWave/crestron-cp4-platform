using System.Linq;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Devices;
using CrestronCP4.ProcessorSide.Infrastructure;

namespace CoreTests
{
    public class DeviceProfileLoaderTests
    {
        private class TestLogger : ILogger
        {
            public void Info(string message) { }
            public void Warn(string message) { }
            public void Error(string message) { }
        }

        private class TestFileSystem : IFileSystem
        {
            private readonly System.Collections.Generic.Dictionary<string, string> _files = new();

            public void AddFile(string path, string content)
            {
                _files[path] = content;
            }

            public bool FileExists(string path) => _files.ContainsKey(path);
            public string ReadAllText(string path) => _files[path];
        }

        private const string SamsungProfileJson = @"{
            ""id"": ""samsung-qn-series"",
            ""manufacturer"": ""Samsung"",
            ""model"": ""QN Series"",
            ""category"": ""display"",
            ""protocols"": {
                ""ir"": {
                    ""driverFile"": ""Samsung_TV.ir"",
                    ""commands"": {
                        ""powerOn"": ""POWER_ON"",
                        ""powerOff"": ""POWER_OFF""
                    }
                }
            },
            ""capabilities"": {
                ""discretePower"": true,
                ""volumeControl"": true,
                ""inputSelect"": true,
                ""feedback"": false,
                ""warmupMs"": 5000,
                ""cooldownMs"": 2000
            }
        }";

        [Fact]
        public void LoadProfile_ValidJson_LoadsSuccessfully()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/devices/samsung.json", SamsungProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            loader.LoadProfile("/devices/samsung.json");

            var profile = loader.GetProfile("samsung-qn-series");
            Assert.NotNull(profile);
            Assert.Equal("Samsung", profile.Manufacturer);
            Assert.Equal("QN Series", profile.Model);
            Assert.Equal("display", profile.Category);
        }

        [Fact]
        public void LoadProfile_ReturnsIrProtocol()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/devices/samsung.json", SamsungProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            loader.LoadProfile("/devices/samsung.json");
            var profile = loader.GetProfile("samsung-qn-series");

            Assert.NotNull(profile?.Protocols?.Ir);
            Assert.Equal("Samsung_TV.ir", profile.Protocols.Ir.DriverFile);
        }

        [Fact]
        public void LoadProfile_DeserializesCommandsDictionary()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/devices/samsung.json", SamsungProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            loader.LoadProfile("/devices/samsung.json");
            var profile = loader.GetProfile("samsung-qn-series");

            Assert.NotNull(profile?.Protocols?.Ir?.Commands);
            Assert.Equal(2, profile.Protocols.Ir.Commands.Count);
            Assert.Equal("POWER_ON", profile.Protocols.Ir.Commands["powerOn"]);
            Assert.Equal("POWER_OFF", profile.Protocols.Ir.Commands["powerOff"]);
        }

        [Fact]
        public void LoadProfile_ReturnsCapabilities()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/devices/samsung.json", SamsungProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            loader.LoadProfile("/devices/samsung.json");
            var profile = loader.GetProfile("samsung-qn-series");

            Assert.NotNull(profile?.Capabilities);
            Assert.True(profile.Capabilities.DiscretePower);
            Assert.True(profile.Capabilities.VolumeControl);
            Assert.Equal(5000, profile.Capabilities.WarmupMs);
        }

        [Fact]
        public void GetProfile_NonexistentId_ReturnsNull()
        {
            var fs = new TestFileSystem();
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            Assert.Null(loader.GetProfile("nonexistent"));
        }

        [Fact]
        public void GetProfile_NullId_ReturnsNull()
        {
            var fs = new TestFileSystem();
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            Assert.Null(loader.GetProfile(null!));
        }

        [Fact]
        public void LoadProfile_NonexistentFile_NoError()
        {
            var fs = new TestFileSystem();
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            loader.LoadProfile("/nonexistent.json");
            Assert.Empty(loader.AllProfiles);
        }

        [Fact]
        public void LoadProfile_InvalidJson_NoError()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/bad.json", "not valid json");
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            loader.LoadProfile("/bad.json");
            Assert.Empty(loader.AllProfiles);
        }

        [Fact]
        public void LoadProfile_MultipleProfiles_AllAccessible()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/samsung.json", SamsungProfileJson);
            fs.AddFile("/lg.json", @"{
                ""id"": ""lg-webos"",
                ""manufacturer"": ""LG"",
                ""model"": ""WebOS"",
                ""category"": ""display"",
                ""protocols"": {},
                ""capabilities"": {}
            }");
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            loader.LoadProfile("/samsung.json");
            loader.LoadProfile("/lg.json");

            Assert.Equal(2, loader.AllProfiles.Count());
            Assert.NotNull(loader.GetProfile("samsung-qn-series"));
            Assert.NotNull(loader.GetProfile("lg-webos"));
        }

        [Fact]
        public void LoadProfile_SameIdTwice_OverwritesPrevious()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/v1.json", SamsungProfileJson);
            fs.AddFile("/v2.json", SamsungProfileJson.Replace("QN Series", "QN Updated"));
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            loader.LoadProfile("/v1.json");
            loader.LoadProfile("/v2.json");

            var profile = loader.GetProfile("samsung-qn-series");
            Assert.Equal("QN Updated", profile?.Model);
        }

        [Fact]
        public void GetProfile_CaseInsensitive()
        {
            var fs = new TestFileSystem();
            fs.AddFile("/samsung.json", SamsungProfileJson);
            var loader = new DeviceProfileLoader(fs, new TestLogger());

            loader.LoadProfile("/samsung.json");

            Assert.NotNull(loader.GetProfile("SAMSUNG-QN-SERIES"));
            Assert.NotNull(loader.GetProfile("Samsung-QN-Series"));
        }
    }
}
