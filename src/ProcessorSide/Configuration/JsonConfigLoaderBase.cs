using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Serialization.Json;
using System.Text;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Infrastructure;

namespace CrestronCP4.ProcessorSide.Configuration
{
    public abstract class JsonConfigLoaderBase<TConfig, TResult>
        where TConfig : class
    {
        private readonly IFileSystem _fileSystem;
        private readonly ILogger _logger;

        protected JsonConfigLoaderBase(IFileSystem fileSystem, ILogger logger)
        {
            _fileSystem = fileSystem;
            _logger = logger;
        }

        protected IFileSystem FileSystem => _fileSystem;
        protected ILogger Logger => _logger;

        protected abstract string EmptyPathError { get; }
        protected abstract string FileNotFoundError(string path);
        protected abstract string NullDeserializationError { get; }
        protected abstract string ParseError(Exception ex);
        protected abstract void LogSuccess(string path);
        protected abstract TResult BuildResult(TConfig config, List<string> errors);

        public TResult Load(string path)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(path))
            {
                errors.Add(EmptyPathError);
                return BuildResult(null, errors);
            }

            if (!_fileSystem.FileExists(path))
            {
                errors.Add(FileNotFoundError(path));
                return BuildResult(null, errors);
            }

            try
            {
                var json = _fileSystem.ReadAllText(path);
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                {
                    var serializer = new DataContractJsonSerializer(typeof(TConfig));
                    var config = serializer.ReadObject(stream) as TConfig;
                    if (config == null)
                    {
                        errors.Add(NullDeserializationError);
                        return BuildResult(null, errors);
                    }

                    LogSuccess(path);
                    return BuildResult(config, errors);
                }
            }
            catch (Exception ex)
            {
                _logger.Error(ParseError(ex));
                errors.Add(ParseError(ex));
                return BuildResult(null, errors);
            }
        }
    }
}
