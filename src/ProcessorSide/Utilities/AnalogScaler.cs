using System;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Scale between Crestron analog (0-65535), percent (0-100), and custom ranges.
    /// Ported from volume/dimmer SIMPL+ modules.
    /// </summary>
    public static class AnalogScaler
    {
        /// <summary>
        /// Crestron full analog range.
        /// </summary>
        public const int ANALOG_MAX = 65535;

        /// <summary>
        /// Scale from one range to another.
        /// </summary>
        public static int Scale(int value, int fromMin, int fromMax, int toMin, int toMax)
        {
            if (fromMax == fromMin) return toMin;
            var clamped = Math.Max(fromMin, Math.Min(fromMax, value));
            long result = ((long)(clamped - fromMin) * (toMax - toMin)) / (fromMax - fromMin) + toMin;
            return (int)result;
        }

        /// <summary>
        /// Convert Crestron analog (0-65535) to percent (0-100).
        /// </summary>
        public static int AnalogToPercent(int analog)
        {
            return Scale(analog, 0, ANALOG_MAX, 0, 100);
        }

        /// <summary>
        /// Convert percent (0-100) to Crestron analog (0-65535).
        /// </summary>
        public static int PercentToAnalog(int percent)
        {
            return Scale(percent, 0, 100, 0, ANALOG_MAX);
        }

        /// <summary>
        /// Convert Crestron analog (0-65535) to custom range.
        /// Example: AnalogToRange(32768, 0, 255) → 128
        /// </summary>
        public static int AnalogToRange(int analog, int rangeMin, int rangeMax)
        {
            return Scale(analog, 0, ANALOG_MAX, rangeMin, rangeMax);
        }

        /// <summary>
        /// Convert custom range to Crestron analog (0-65535).
        /// Example: RangeToAnalog(128, 0, 255) → 32896
        /// </summary>
        public static int RangeToAnalog(int value, int rangeMin, int rangeMax)
        {
            return Scale(value, rangeMin, rangeMax, 0, ANALOG_MAX);
        }

        /// <summary>
        /// Convert Crestron analog to dB range (common for audio).
        /// Example: AnalogToDb(32768, -80, 0) → -40
        /// </summary>
        public static int AnalogToDb(int analog, int dbMin, int dbMax)
        {
            return Scale(analog, 0, ANALOG_MAX, dbMin, dbMax);
        }

        /// <summary>
        /// Convert dB to Crestron analog.
        /// </summary>
        public static int DbToAnalog(int db, int dbMin, int dbMax)
        {
            return Scale(db, dbMin, dbMax, 0, ANALOG_MAX);
        }

        /// <summary>
        /// Convert Crestron analog (0-65535) to byte (0-255).
        /// Common for DMX values.
        /// </summary>
        public static byte AnalogToByte(int analog)
        {
            return (byte)Scale(analog, 0, ANALOG_MAX, 0, 255);
        }

        /// <summary>
        /// Convert byte (0-255) to Crestron analog (0-65535).
        /// </summary>
        public static int ByteToAnalog(byte value)
        {
            return Scale(value, 0, 255, 0, ANALOG_MAX);
        }
    }
}
