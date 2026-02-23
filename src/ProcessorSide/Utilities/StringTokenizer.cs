using System;
using System.Collections.Generic;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Delimiter-based string splitting and extraction.
    /// Replaces SIMPL+ find()/mid()/left()/right()/remove() patterns.
    /// </summary>
    public static class StringTokenizer
    {
        /// <summary>
        /// Split a string by delimiter and return all tokens.
        /// </summary>
        public static string[] Split(string input, string delimiter)
        {
            if (string.IsNullOrEmpty(input)) return new string[0];
            if (string.IsNullOrEmpty(delimiter)) return new[] { input };
            return input.Split(new[] { delimiter }, StringSplitOptions.None);
        }

        /// <summary>
        /// Get a specific token (1-based index, like SIMPL+).
        /// </summary>
        public static string GetToken(string input, string delimiter, int tokenIndex)
        {
            var tokens = Split(input, delimiter);
            if (tokenIndex < 1 || tokenIndex > tokens.Length) return "";
            return tokens[tokenIndex - 1];
        }

        /// <summary>
        /// Extract text between two delimiters.
        /// Equivalent to: find start, then find end after start, extract middle.
        /// </summary>
        public static string ExtractBetween(string input, string startDelimiter, string endDelimiter)
        {
            if (string.IsNullOrEmpty(input)) return "";
            var start = input.IndexOf(startDelimiter);
            if (start < 0) return "";
            start += startDelimiter.Length;
            var end = input.IndexOf(endDelimiter, start);
            if (end < 0) return input.Substring(start);
            return input.Substring(start, end - start);
        }

        /// <summary>
        /// Equivalent to SIMPL+ left(str, n) — returns first n characters.
        /// </summary>
        public static string Left(string input, int count)
        {
            if (string.IsNullOrEmpty(input) || count <= 0) return "";
            return input.Substring(0, Math.Min(count, input.Length));
        }

        /// <summary>
        /// Equivalent to SIMPL+ right(str, n) — returns last n characters.
        /// </summary>
        public static string Right(string input, int count)
        {
            if (string.IsNullOrEmpty(input) || count <= 0) return "";
            if (count >= input.Length) return input;
            return input.Substring(input.Length - count);
        }

        /// <summary>
        /// Equivalent to SIMPL+ mid(str, start, len) — 1-based start index.
        /// </summary>
        public static string Mid(string input, int start, int length)
        {
            if (string.IsNullOrEmpty(input) || start < 1) return "";
            var idx = start - 1; // Convert to 0-based
            if (idx >= input.Length) return "";
            return input.Substring(idx, Math.Min(length, input.Length - idx));
        }

        /// <summary>
        /// Equivalent to SIMPL+ find(pattern, str) — returns 1-based position, 0 if not found.
        /// </summary>
        public static int Find(string pattern, string input)
        {
            if (string.IsNullOrEmpty(input) || string.IsNullOrEmpty(pattern)) return 0;
            var idx = input.IndexOf(pattern);
            return idx >= 0 ? idx + 1 : 0;
        }

        /// <summary>
        /// Remove first occurrence of a string (like SIMPL+ remove pattern).
        /// Returns everything before the first occurrence of the delimiter.
        /// </summary>
        public static string RemoveUpTo(ref string input, string delimiter)
        {
            if (string.IsNullOrEmpty(input) || string.IsNullOrEmpty(delimiter))
            {
                var result = input ?? "";
                input = "";
                return result;
            }

            var idx = input.IndexOf(delimiter);
            if (idx < 0) return "";

            var before = input.Substring(0, idx);
            input = input.Substring(idx + delimiter.Length);
            return before;
        }

        /// <summary>
        /// Parse a key=value pair from a string.
        /// </summary>
        public static bool TryParseKeyValue(string input, string separator, out string key, out string value)
        {
            key = "";
            value = "";
            if (string.IsNullOrEmpty(input) || string.IsNullOrEmpty(separator)) return false;

            var idx = input.IndexOf(separator);
            if (idx < 0) return false;

            key = input.Substring(0, idx).Trim();
            value = input.Substring(idx + separator.Length).Trim();
            return true;
        }
    }
}
