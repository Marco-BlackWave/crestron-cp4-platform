using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Regex-based and prefix-match feedback parsing engine.
    /// Replaces common SIMPL+ find()/mid()/left()/right() patterns.
    /// Used by all serial device drivers for response parsing.
    /// </summary>
    public sealed class FeedbackParser
    {
        private readonly List<FeedbackPattern> _patterns = new List<FeedbackPattern>();

        public event EventHandler<FeedbackMatchEventArgs> MatchFound;

        /// <summary>
        /// Add a regex pattern to match. Group 1 is extracted as the value.
        /// </summary>
        public void AddPattern(string signalName, string regexPattern)
        {
            if (string.IsNullOrEmpty(signalName) || string.IsNullOrEmpty(regexPattern)) return;
            _patterns.Add(new FeedbackPattern
            {
                SignalName = signalName,
                Regex = new Regex(regexPattern, RegexOptions.Compiled),
                Type = PatternType.Regex
            });
        }

        /// <summary>
        /// Add a prefix match. Data after prefix is extracted as the value.
        /// </summary>
        public void AddPrefixMatch(string signalName, string prefix, string terminator = "\r")
        {
            if (string.IsNullOrEmpty(signalName) || string.IsNullOrEmpty(prefix)) return;
            _patterns.Add(new FeedbackPattern
            {
                SignalName = signalName,
                Prefix = prefix,
                Terminator = terminator ?? "\r",
                Type = PatternType.Prefix
            });
        }

        /// <summary>
        /// Add an exact match that triggers a fixed value signal.
        /// </summary>
        public void AddExactMatch(string signalName, string exactString, object fixedValue)
        {
            if (string.IsNullOrEmpty(signalName) || string.IsNullOrEmpty(exactString)) return;
            _patterns.Add(new FeedbackPattern
            {
                SignalName = signalName,
                ExactMatch = exactString,
                FixedValue = fixedValue,
                Type = PatternType.Exact
            });
        }

        /// <summary>
        /// Parse incoming data against all registered patterns.
        /// Raises MatchFound for each match.
        /// </summary>
        public void Parse(string data)
        {
            if (string.IsNullOrEmpty(data)) return;

            foreach (var pattern in _patterns)
            {
                try
                {
                    switch (pattern.Type)
                    {
                        case PatternType.Regex:
                            var match = pattern.Regex.Match(data);
                            if (match.Success)
                            {
                                var value = match.Groups.Count > 1 ? match.Groups[1].Value : match.Value;
                                RaiseMatch(pattern.SignalName, value);
                            }
                            break;

                        case PatternType.Prefix:
                            var prefixIdx = data.IndexOf(pattern.Prefix);
                            if (prefixIdx >= 0)
                            {
                                var start = prefixIdx + pattern.Prefix.Length;
                                var end = data.IndexOf(pattern.Terminator, start);
                                var val = end > start ? data.Substring(start, end - start) : data.Substring(start);
                                RaiseMatch(pattern.SignalName, val.Trim());
                            }
                            break;

                        case PatternType.Exact:
                            if (data.Contains(pattern.ExactMatch))
                            {
                                RaiseMatch(pattern.SignalName, pattern.FixedValue);
                            }
                            break;
                    }
                }
                catch
                {
                    // Skip malformed patterns; don't crash the parser
                }
            }
        }

        /// <summary>
        /// Clear all registered patterns.
        /// </summary>
        public void Clear()
        {
            _patterns.Clear();
        }

        private void RaiseMatch(string signalName, object value)
        {
            MatchFound?.Invoke(this, new FeedbackMatchEventArgs(signalName, value));
        }

        private enum PatternType { Regex, Prefix, Exact }

        private sealed class FeedbackPattern
        {
            public string SignalName;
            public PatternType Type;
            public Regex Regex;
            public string Prefix;
            public string Terminator;
            public string ExactMatch;
            public object FixedValue;
        }
    }

    public sealed class FeedbackMatchEventArgs : EventArgs
    {
        public string SignalName { get; }
        public object Value { get; }

        public FeedbackMatchEventArgs(string signalName, object value)
        {
            SignalName = signalName;
            Value = value;
        }

        /// <summary>
        /// Try to get value as integer.
        /// </summary>
        public bool TryGetInt(out int result)
        {
            if (Value is int i) { result = i; return true; }
            if (Value is string s && int.TryParse(s, out result)) return true;
            result = 0;
            return false;
        }

        /// <summary>
        /// Get value as string.
        /// </summary>
        public string GetString()
        {
            return Value?.ToString() ?? "";
        }
    }
}
