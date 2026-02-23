using System;
using System.Text;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Hex string ↔ byte array conversions.
    /// Ported from KNX and HiQnet SIMPL+ modules.
    /// </summary>
    public static class HexEncoder
    {
        /// <summary>
        /// Convert byte array to hex string ("FF0A2B").
        /// </summary>
        public static string ToHexString(byte[] data)
        {
            if (data == null || data.Length == 0) return "";
            var sb = new StringBuilder(data.Length * 2);
            for (int i = 0; i < data.Length; i++)
                sb.Append(data[i].ToString("X2"));
            return sb.ToString();
        }

        /// <summary>
        /// Convert byte array to hex string with separator ("FF 0A 2B").
        /// </summary>
        public static string ToHexString(byte[] data, string separator)
        {
            if (data == null || data.Length == 0) return "";
            var sb = new StringBuilder(data.Length * 3);
            for (int i = 0; i < data.Length; i++)
            {
                if (i > 0 && separator != null) sb.Append(separator);
                sb.Append(data[i].ToString("X2"));
            }
            return sb.ToString();
        }

        /// <summary>
        /// Convert hex string to byte array. Supports with/without spaces/separators.
        /// "FF0A2B" or "FF 0A 2B" or "FF:0A:2B" → byte[]{0xFF, 0x0A, 0x2B}
        /// </summary>
        public static byte[] FromHexString(string hex)
        {
            if (string.IsNullOrEmpty(hex)) return new byte[0];

            // Strip common separators
            var clean = new StringBuilder(hex.Length);
            for (int i = 0; i < hex.Length; i++)
            {
                var c = hex[i];
                if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f'))
                    clean.Append(c);
            }

            var cleanStr = clean.ToString();
            if (cleanStr.Length % 2 != 0) cleanStr = "0" + cleanStr; // Pad odd length

            var result = new byte[cleanStr.Length / 2];
            for (int i = 0; i < result.Length; i++)
            {
                result[i] = (byte)((ParseNibble(cleanStr[i * 2]) << 4) | ParseNibble(cleanStr[i * 2 + 1]));
            }
            return result;
        }

        /// <summary>
        /// Convert a single byte to 2-char hex string.
        /// </summary>
        public static string ByteToHex(byte b)
        {
            return b.ToString("X2");
        }

        /// <summary>
        /// Parse a hex string to a single byte.
        /// </summary>
        public static byte HexToByte(string hex)
        {
            if (string.IsNullOrEmpty(hex)) return 0;
            byte.TryParse(hex, System.Globalization.NumberStyles.HexNumber, null, out var result);
            return result;
        }

        /// <summary>
        /// Convert an integer to a big-endian hex byte array.
        /// </summary>
        public static byte[] IntToBytes(int value, int byteCount)
        {
            var result = new byte[byteCount];
            for (int i = byteCount - 1; i >= 0; i--)
            {
                result[i] = (byte)(value & 0xFF);
                value >>= 8;
            }
            return result;
        }

        /// <summary>
        /// Convert big-endian byte array to integer.
        /// </summary>
        public static int BytesToInt(byte[] data, int offset, int length)
        {
            if (data == null) return 0;
            int result = 0;
            for (int i = 0; i < length && (offset + i) < data.Length; i++)
            {
                result = (result << 8) | data[offset + i];
            }
            return result;
        }

        private static int ParseNibble(char c)
        {
            if (c >= '0' && c <= '9') return c - '0';
            if (c >= 'A' && c <= 'F') return c - 'A' + 10;
            if (c >= 'a' && c <= 'f') return c - 'a' + 10;
            return 0;
        }
    }
}
