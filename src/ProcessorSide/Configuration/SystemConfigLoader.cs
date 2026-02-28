using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Infrastructure;

namespace CrestronCP4.ProcessorSide.Configuration
{
    public sealed class SystemConfigLoader : JsonConfigLoaderBase<SystemConfig, SystemConfigLoadResult>
    {
        public SystemConfigLoader(IFileSystem fileSystem, ILogger logger)
            : base(fileSystem, logger)
        {
            if (fileSystem == null) throw new ArgumentNullException(nameof(fileSystem));
            if (logger == null) throw new ArgumentNullException(nameof(logger));
        }

        protected override string EmptyPathError => "Config path is null or empty.";

        protected override string FileNotFoundError(string path) => "Config file not found: " + path;

        protected override string NullDeserializationError => "Failed to parse config: deserialized config was null.";

        protected override string ParseError(Exception ex) => "Failed to parse config: " + ex.Message;

        protected override void LogSuccess(string path)
        {
            Logger.Info("SystemConfig loaded from " + path);
        }

        protected override SystemConfigLoadResult BuildResult(SystemConfig config, List<string> errors)
        {
            return new SystemConfigLoadResult(config, errors);
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
