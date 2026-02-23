using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Serialization.Json;
using System.Text;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Infrastructure;

namespace CrestronCP4.ProcessorSide.Configuration
{
    public sealed class SystemConfigLoader
    {
        private readonly IFileSystem _fileSystem;
        private readonly ILogger _logger;

        public SystemConfigLoader(IFileSystem fileSystem, ILogger logger)
        {
            _fileSystem = fileSystem ?? throw new ArgumentNullException(nameof(fileSystem));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public SystemConfigLoadResult Load(string path)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(path))
            {
                errors.Add("Config path is null or empty.");
                return new SystemConfigLoadResult(null, errors);
            }

            if (!_fileSystem.FileExists(path))
            {
                errors.Add("Config file not found: " + path);
                return new SystemConfigLoadResult(null, errors);
            }

            try
            {
                var json = _fileSystem.ReadAllText(path);
                var serializer = new DataContractJsonSerializer(typeof(SystemConfig));
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                {
                    var config = (SystemConfig)serializer.ReadObject(stream);
                    _logger.Info("SystemConfig loaded from " + path);
                    return new SystemConfigLoadResult(config, errors);
                }
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to parse SystemConfig: " + ex.Message);
                errors.Add("Failed to parse config: " + ex.Message);
                return new SystemConfigLoadResult(null, errors);
            }
        }
    }

    public sealed class SystemConfigLoadResult
    {
        public SystemConfig Config { get; }
        public List<string> Errors { get; }
        public bool Success => Config != null && Errors.Count == 0;

        public SystemConfigLoadResult(SystemConfig config, List<string> errors)
        {
            Config = config;
            Errors = errors ?? new List<string>();
        }
    }
}
