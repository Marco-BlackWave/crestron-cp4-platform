using System;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Time formatting and conversion.
    /// Seconds ↔ HH:MM:SS conversion and formatting.
    /// Ported from clock/timer SIMPL+ modules.
    /// </summary>
    public static class TimeFormatter
    {
        /// <summary>
        /// Convert total seconds to HH:MM:SS string.
        /// </summary>
        public static string SecondsToHms(int totalSeconds)
        {
            if (totalSeconds < 0) totalSeconds = 0;
            var hours = totalSeconds / 3600;
            var minutes = (totalSeconds % 3600) / 60;
            var seconds = totalSeconds % 60;
            return hours.ToString("D2") + ":" + minutes.ToString("D2") + ":" + seconds.ToString("D2");
        }

        /// <summary>
        /// Convert total seconds to MM:SS string (no hours).
        /// </summary>
        public static string SecondsToMs(int totalSeconds)
        {
            if (totalSeconds < 0) totalSeconds = 0;
            var minutes = totalSeconds / 60;
            var seconds = totalSeconds % 60;
            return minutes.ToString("D2") + ":" + seconds.ToString("D2");
        }

        /// <summary>
        /// Parse HH:MM:SS string to total seconds.
        /// </summary>
        public static int HmsToSeconds(string hms)
        {
            if (string.IsNullOrEmpty(hms)) return 0;
            var parts = hms.Split(':');
            if (parts.Length == 3 &&
                int.TryParse(parts[0], out var h) &&
                int.TryParse(parts[1], out var m) &&
                int.TryParse(parts[2], out var s))
            {
                return (h * 3600) + (m * 60) + s;
            }
            if (parts.Length == 2 &&
                int.TryParse(parts[0], out var min) &&
                int.TryParse(parts[1], out var sec))
            {
                return (min * 60) + sec;
            }
            return 0;
        }

        /// <summary>
        /// Convert seconds to human-readable duration ("2h 15m 30s").
        /// </summary>
        public static string SecondsToReadable(int totalSeconds)
        {
            if (totalSeconds < 0) totalSeconds = 0;
            if (totalSeconds == 0) return "0s";

            var hours = totalSeconds / 3600;
            var minutes = (totalSeconds % 3600) / 60;
            var seconds = totalSeconds % 60;

            var result = "";
            if (hours > 0) result += hours + "h ";
            if (minutes > 0) result += minutes + "m ";
            if (seconds > 0 || result.Length == 0) result += seconds + "s";
            return result.TrimEnd();
        }

        /// <summary>
        /// Get current time as HH:MM:SS string.
        /// </summary>
        public static string GetCurrentTime()
        {
            var now = DateTime.Now;
            return now.Hour.ToString("D2") + ":" + now.Minute.ToString("D2") + ":" + now.Second.ToString("D2");
        }

        /// <summary>
        /// Get current date as YYYY-MM-DD string.
        /// </summary>
        public static string GetCurrentDate()
        {
            var now = DateTime.Now;
            return now.Year + "-" + now.Month.ToString("D2") + "-" + now.Day.ToString("D2");
        }

        /// <summary>
        /// Convert Crestron time value (seconds since midnight) to HH:MM:SS.
        /// </summary>
        public static string CrestronTimeToHms(int secondsSinceMidnight)
        {
            return SecondsToHms(secondsSinceMidnight);
        }
    }
}
