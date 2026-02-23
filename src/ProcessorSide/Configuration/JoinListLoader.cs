using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Serialization.Json;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Infrastructure;

namespace CrestronCP4.ProcessorSide.Configuration
{
    public sealed class JoinListLoader
    {
        private readonly IFileSystem _fileSystem;
        private readonly ILogger _logger;

        public JoinListLoader(IFileSystem fileSystem, ILogger logger)
        {
            _fileSystem = fileSystem;
            _logger = logger;
        }

        public JoinListLoadResult Load(string path)
        {
            var result = new JoinListLoadResult();

            if (string.IsNullOrWhiteSpace(path))
            {
                result.Errors.Add("Join List path is empty.");
                return result;
            }

            if (!_fileSystem.FileExists(path))
            {
                result.Errors.Add("Join List file not found: " + path);
                return result;
            }

            try
            {
                var json = _fileSystem.ReadAllText(path);
                using (var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(json)))
                {
                    var serializer = new DataContractJsonSerializer(typeof(JoinListConfig));
                    var config = serializer.ReadObject(stream) as JoinListConfig;
                    if (config == null)
                    {
                        result.Errors.Add("Join List JSON deserialized to null.");
                        return result;
                    }

                    result.Config = config;
                    return result;
                }
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to load Join List: " + ex.Message);
                result.Errors.Add("Failed to parse Join List JSON.");
                return result;
            }
        }
    }

    public sealed class JoinListLoadResult
    {
        public JoinListConfig Config { get; set; }
        public bool Success => Config != null && Errors.Count == 0;
        public List<string> Errors { get; } = new List<string>();
    }
}
