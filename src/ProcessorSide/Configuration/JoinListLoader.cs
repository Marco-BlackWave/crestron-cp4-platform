using System;
using System.Collections.Generic;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Infrastructure;

namespace CrestronCP4.ProcessorSide.Configuration
{
    public sealed class JoinListLoader : JsonConfigLoaderBase<JoinListConfig, JoinListLoadResult>
    {
        public JoinListLoader(IFileSystem fileSystem, ILogger logger)
            : base(fileSystem, logger)
        {
        }

        protected override string EmptyPathError => "Join List path is empty.";

        protected override string FileNotFoundError(string path) => "Join List file not found: " + path;

        protected override string NullDeserializationError => "Join List JSON deserialized to null.";

        protected override string ParseError(Exception ex) => "Failed to parse Join List JSON.";

        protected override void LogSuccess(string path)
        {
            Logger.Info("JoinList loaded from " + path);
        }

        protected override JoinListLoadResult BuildResult(JoinListConfig config, List<string> errors)
        {
            var result = new JoinListLoadResult
            {
                Config = config
            };

            if (errors != null)
            {
                foreach (var error in errors)
                {
                    result.Errors.Add(error);
                }
            }

            return result;
        }
    }

    public sealed class JoinListLoadResult
    {
        public JoinListConfig Config { get; set; }
        public bool Success => Config != null && Errors.Count == 0;
        public List<string> Errors { get; } = new List<string>();
    }
}
