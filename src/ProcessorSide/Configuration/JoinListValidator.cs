using System;
using System.Collections.Generic;

namespace CrestronCP4.ProcessorSide.Configuration
{
    public sealed class JoinListValidator
    {
        public ValidationResult Validate(JoinListConfig config)
        {
            var result = new ValidationResult();

            if (config == null)
            {
                result.Errors.Add("Join List config is null.");
                return result;
            }

            if (string.IsNullOrWhiteSpace(config.SchemaVersion))
            {
                result.Errors.Add("schemaVersion is missing.");
            }
            else if (!string.Equals(config.SchemaVersion, "1.0", StringComparison.OrdinalIgnoreCase))
            {
                result.Errors.Add("Unsupported schemaVersion: " + config.SchemaVersion);
            }

            if (string.IsNullOrWhiteSpace(config.Processor))
            {
                result.Errors.Add("processor is missing.");
            }
            else if (!string.Equals(config.Processor, "CP4", StringComparison.OrdinalIgnoreCase))
            {
                result.Errors.Add("processor must be CP4.");
            }

            if (string.IsNullOrWhiteSpace(config.ProjectId))
            {
                result.Errors.Add("projectId is required.");
            }

            if (config.Joins == null)
            {
                result.Errors.Add("joins section is missing.");
                return result;
            }

            ValidateJoinList("digital", config.Joins.Digital, result);
            ValidateJoinList("analog", config.Joins.Analog, result);
            ValidateJoinList("serial", config.Joins.Serial, result);

            return result;
        }

        private static void ValidateJoinList(string joinType, List<JoinEntry> joins, ValidationResult result)
        {
            if (joins == null || joins.Count == 0)
            {
                return;
            }

            var seen = new HashSet<ushort>();
            foreach (var entry in joins)
            {
                if (entry == null)
                {
                    result.Errors.Add(joinType + " entry is null.");
                    continue;
                }

                if (entry.Join == 0)
                {
                    result.Errors.Add(joinType + " join must be > 0.");
                }
                else if (!seen.Add(entry.Join))
                {
                    result.Errors.Add(joinType + " join collision: " + entry.Join);
                }

                if (string.IsNullOrWhiteSpace(entry.Name))
                {
                    result.Errors.Add(joinType + " join name is missing for join " + entry.Join);
                }

                if (string.IsNullOrWhiteSpace(entry.Direction))
                {
                    result.Errors.Add(joinType + " join direction is missing for join " + entry.Join);
                }
                else if (!IsValidDirection(entry.Direction))
                {
                    result.Errors.Add(joinType + " join direction must be input or output for join " + entry.Join);
                }
            }
        }

        private static bool IsValidDirection(string direction)
        {
            return string.Equals(direction, "input", StringComparison.OrdinalIgnoreCase)
                || string.Equals(direction, "output", StringComparison.OrdinalIgnoreCase);
        }
    }

    public sealed class ValidationResult
    {
        public bool IsValid => Errors.Count == 0;
        public List<string> Errors { get; } = new List<string>();
    }
}
