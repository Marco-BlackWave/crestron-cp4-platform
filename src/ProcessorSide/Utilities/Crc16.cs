namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// CRC-16 calculation utility.
    /// Supports configurable polynomial and initial value.
    /// Default: CRC-16/Modbus (polynomial 0xA001, init 0xFFFF).
    /// Ported from AA_MODBUS and KYO320 SIMPL+ modules.
    /// </summary>
    public static class Crc16
    {
        /// <summary>
        /// Calculate CRC-16/Modbus (most common in Crestron serial devices).
        /// </summary>
        public static ushort CalculateModbus(byte[] data)
        {
            return Calculate(data, 0, data.Length, 0xFFFF, 0xA001);
        }

        /// <summary>
        /// Calculate CRC-16/Modbus for a portion of a byte array.
        /// </summary>
        public static ushort CalculateModbus(byte[] data, int offset, int length)
        {
            return Calculate(data, offset, length, 0xFFFF, 0xA001);
        }

        /// <summary>
        /// Calculate CRC-16/CCITT (used by some KNX and security modules).
        /// </summary>
        public static ushort CalculateCcitt(byte[] data)
        {
            return CalculateCcitt(data, 0, data.Length);
        }

        /// <summary>
        /// Calculate CRC-16/CCITT for a portion of a byte array.
        /// </summary>
        public static ushort CalculateCcitt(byte[] data, int offset, int length)
        {
            ushort crc = 0xFFFF;
            for (int i = offset; i < offset + length && i < data.Length; i++)
            {
                crc ^= (ushort)(data[i] << 8);
                for (int j = 0; j < 8; j++)
                {
                    if ((crc & 0x8000) != 0)
                        crc = (ushort)((crc << 1) ^ 0x1021);
                    else
                        crc <<= 1;
                }
            }
            return crc;
        }

        /// <summary>
        /// Calculate CRC-16 with configurable polynomial and initial value.
        /// </summary>
        public static ushort Calculate(byte[] data, int offset, int length, ushort init, ushort polynomial)
        {
            ushort crc = init;
            for (int i = offset; i < offset + length && i < data.Length; i++)
            {
                crc ^= data[i];
                for (int j = 0; j < 8; j++)
                {
                    if ((crc & 0x0001) != 0)
                    {
                        crc >>= 1;
                        crc ^= polynomial;
                    }
                    else
                    {
                        crc >>= 1;
                    }
                }
            }
            return crc;
        }

        /// <summary>
        /// Append CRC-16/Modbus to a byte array (low byte first, as per Modbus convention).
        /// </summary>
        public static byte[] AppendModbusCrc(byte[] data)
        {
            var crc = CalculateModbus(data);
            var result = new byte[data.Length + 2];
            System.Array.Copy(data, result, data.Length);
            result[data.Length] = (byte)(crc & 0xFF);        // Low byte
            result[data.Length + 1] = (byte)((crc >> 8) & 0xFF); // High byte
            return result;
        }

        /// <summary>
        /// Verify CRC-16/Modbus on received data (last 2 bytes are CRC).
        /// </summary>
        public static bool VerifyModbusCrc(byte[] data)
        {
            if (data == null || data.Length < 3) return false;
            var calculated = CalculateModbus(data, 0, data.Length - 2);
            var received = (ushort)(data[data.Length - 2] | (data[data.Length - 1] << 8));
            return calculated == received;
        }
    }
}
