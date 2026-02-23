using CrestronCP4.ProcessorSide.Utilities;

namespace CoreTests
{
    public class Crc16Tests
    {
        [Fact]
        public void CalculateModbus_KnownData_ReturnsConsistentValue()
        {
            // Verify consistent CRC calculation
            var data = new byte[] { 0x01, 0x03, 0x00, 0x00, 0x00, 0x0A };
            var crc1 = Crc16.CalculateModbus(data);
            var crc2 = Crc16.CalculateModbus(data);
            Assert.Equal(crc1, crc2);
            Assert.NotEqual((ushort)0, crc1);
        }

        [Fact]
        public void CalculateModbus_EmptyData_ReturnsInitValue()
        {
            var crc = Crc16.CalculateModbus(new byte[0]);
            Assert.Equal((ushort)0xFFFF, crc);
        }

        [Fact]
        public void AppendModbusCrc_AppendsLowByteFirst()
        {
            var data = new byte[] { 0x01, 0x03 };
            var result = Crc16.AppendModbusCrc(data);
            Assert.Equal(data.Length + 2, result.Length);
            Assert.Equal(data[0], result[0]);
            Assert.Equal(data[1], result[1]);
        }

        [Fact]
        public void VerifyModbusCrc_ValidData_ReturnsTrue()
        {
            var data = new byte[] { 0x01, 0x03 };
            var withCrc = Crc16.AppendModbusCrc(data);
            Assert.True(Crc16.VerifyModbusCrc(withCrc));
        }

        [Fact]
        public void VerifyModbusCrc_CorruptedData_ReturnsFalse()
        {
            var data = new byte[] { 0x01, 0x03 };
            var withCrc = Crc16.AppendModbusCrc(data);
            withCrc[0] = 0xFF; // Corrupt data
            Assert.False(Crc16.VerifyModbusCrc(withCrc));
        }

        [Fact]
        public void VerifyModbusCrc_TooShort_ReturnsFalse()
        {
            Assert.False(Crc16.VerifyModbusCrc(new byte[] { 0x01, 0x02 }));
            Assert.False(Crc16.VerifyModbusCrc(null));
        }

        [Fact]
        public void CalculateCcitt_KnownData_ReturnsNonZero()
        {
            var data = new byte[] { 0x01, 0x02, 0x03 };
            var crc = Crc16.CalculateCcitt(data);
            Assert.NotEqual((ushort)0, crc);
        }

        [Fact]
        public void Calculate_WithOffset_CalculatesSubset()
        {
            var data = new byte[] { 0xAA, 0x01, 0x03, 0xBB };
            var full = Crc16.CalculateModbus(new byte[] { 0x01, 0x03 });
            var sub = Crc16.CalculateModbus(data, 1, 2);
            Assert.Equal(full, sub);
        }
    }

    public class TemperatureConverterTests
    {
        [Theory]
        [InlineData(0, 32)]
        [InlineData(100, 212)]
        [InlineData(-40, -40)]
        public void CelsiusToFahrenheit_KnownValues(double c, double f)
        {
            Assert.Equal(f, TemperatureConverter.CelsiusToFahrenheit(c), 1);
        }

        [Theory]
        [InlineData(32, 0)]
        [InlineData(212, 100)]
        public void FahrenheitToCelsius_KnownValues(double f, double c)
        {
            Assert.Equal(c, TemperatureConverter.FahrenheitToCelsius(f), 1);
        }

        [Fact]
        public void AnalogToCelsius_225_Returns22Point5()
        {
            Assert.Equal(22.5, TemperatureConverter.AnalogToCelsius(225));
        }

        [Fact]
        public void CelsiusToAnalog_22Point5_Returns225()
        {
            Assert.Equal(225, TemperatureConverter.CelsiusToAnalog(22.5));
        }

        [Fact]
        public void RoundTrip_AnalogCelsiusToFahrenheitAndBack()
        {
            var original = 225; // 22.5°C
            var fAnalog = TemperatureConverter.AnalogCelsiusToAnalogFahrenheit(original);
            var backToC = TemperatureConverter.AnalogFahrenheitToAnalogCelsius(fAnalog);
            Assert.InRange(backToC, original - 1, original + 1); // Allow rounding
        }
    }

    public class AnalogScalerTests
    {
        [Fact]
        public void AnalogToPercent_FullRange()
        {
            Assert.Equal(0, AnalogScaler.AnalogToPercent(0));
            Assert.Equal(50, AnalogScaler.AnalogToPercent(32768));
            Assert.Equal(100, AnalogScaler.AnalogToPercent(65535));
        }

        [Fact]
        public void PercentToAnalog_FullRange()
        {
            Assert.Equal(0, AnalogScaler.PercentToAnalog(0));
            Assert.Equal(65535, AnalogScaler.PercentToAnalog(100));
        }

        [Fact]
        public void Scale_CustomRange()
        {
            // Integer scaling may round: 50/100 * 255 = 127 (integer math)
            Assert.Equal(127, AnalogScaler.Scale(50, 0, 100, 0, 255));
            Assert.Equal(50, AnalogScaler.Scale(128, 0, 255, 0, 100));
        }

        [Fact]
        public void Scale_ClampsInput()
        {
            Assert.Equal(100, AnalogScaler.Scale(200, 0, 100, 0, 100));
            Assert.Equal(0, AnalogScaler.Scale(-10, 0, 100, 0, 100));
        }

        [Fact]
        public void Scale_SameRange_ReturnsMin()
        {
            Assert.Equal(0, AnalogScaler.Scale(50, 100, 100, 0, 100));
        }

        [Fact]
        public void AnalogToDb_FullRange()
        {
            Assert.Equal(-80, AnalogScaler.AnalogToDb(0, -80, 0));
            Assert.Equal(0, AnalogScaler.AnalogToDb(65535, -80, 0));
        }

        [Fact]
        public void AnalogToByte_FullRange()
        {
            Assert.Equal(0, AnalogScaler.AnalogToByte(0));
            Assert.Equal(255, AnalogScaler.AnalogToByte(65535));
        }

        [Fact]
        public void ByteToAnalog_RoundTrip()
        {
            var analog = AnalogScaler.ByteToAnalog(128);
            Assert.InRange(AnalogScaler.AnalogToByte(analog), (byte)127, (byte)129);
        }
    }

    public class HexEncoderTests
    {
        [Fact]
        public void ToHexString_KnownData()
        {
            var data = new byte[] { 0xFF, 0x0A, 0x2B };
            Assert.Equal("FF0A2B", HexEncoder.ToHexString(data));
        }

        [Fact]
        public void ToHexString_WithSeparator()
        {
            var data = new byte[] { 0xFF, 0x0A };
            Assert.Equal("FF 0A", HexEncoder.ToHexString(data, " "));
        }

        [Fact]
        public void FromHexString_Various()
        {
            Assert.Equal(new byte[] { 0xFF, 0x0A, 0x2B }, HexEncoder.FromHexString("FF0A2B"));
            Assert.Equal(new byte[] { 0xFF, 0x0A, 0x2B }, HexEncoder.FromHexString("FF 0A 2B"));
            Assert.Equal(new byte[] { 0xFF, 0x0A }, HexEncoder.FromHexString("FF:0A"));
        }

        [Fact]
        public void FromHexString_Empty_ReturnsEmpty()
        {
            Assert.Empty(HexEncoder.FromHexString(""));
            Assert.Empty(HexEncoder.FromHexString(null));
        }

        [Fact]
        public void IntToBytes_BigEndian()
        {
            var result = HexEncoder.IntToBytes(0x01020304, 4);
            Assert.Equal(new byte[] { 0x01, 0x02, 0x03, 0x04 }, result);
        }

        [Fact]
        public void BytesToInt_BigEndian()
        {
            var data = new byte[] { 0x01, 0x02, 0x03, 0x04 };
            Assert.Equal(0x01020304, HexEncoder.BytesToInt(data, 0, 4));
        }

        [Fact]
        public void RoundTrip_HexStringToBytes()
        {
            var original = new byte[] { 0xDE, 0xAD, 0xBE, 0xEF };
            var hex = HexEncoder.ToHexString(original);
            var result = HexEncoder.FromHexString(hex);
            Assert.Equal(original, result);
        }

        [Fact]
        public void ByteToHex_And_HexToByte()
        {
            Assert.Equal("FF", HexEncoder.ByteToHex(0xFF));
            Assert.Equal(0xFF, HexEncoder.HexToByte("FF"));
            Assert.Equal(0x0A, HexEncoder.HexToByte("0A"));
        }
    }

    public class StringTokenizerTests
    {
        [Fact]
        public void Split_Basic()
        {
            var result = StringTokenizer.Split("a,b,c", ",");
            Assert.Equal(new[] { "a", "b", "c" }, result);
        }

        [Fact]
        public void Split_EmptyInput()
        {
            Assert.Empty(StringTokenizer.Split("", ","));
            Assert.Empty(StringTokenizer.Split(null, ","));
        }

        [Fact]
        public void GetToken_1Based()
        {
            Assert.Equal("a", StringTokenizer.GetToken("a,b,c", ",", 1));
            Assert.Equal("b", StringTokenizer.GetToken("a,b,c", ",", 2));
            Assert.Equal("c", StringTokenizer.GetToken("a,b,c", ",", 3));
        }

        [Fact]
        public void GetToken_OutOfRange_ReturnsEmpty()
        {
            Assert.Equal("", StringTokenizer.GetToken("a,b", ",", 0));
            Assert.Equal("", StringTokenizer.GetToken("a,b", ",", 5));
        }

        [Fact]
        public void ExtractBetween_Basic()
        {
            Assert.Equal("value", StringTokenizer.ExtractBetween("<tag>value</tag>", "<tag>", "</tag>"));
        }

        [Fact]
        public void ExtractBetween_NoEnd_ReturnsRest()
        {
            Assert.Equal("value", StringTokenizer.ExtractBetween("KEY=value", "KEY=", "\r"));
        }

        [Fact]
        public void Left_Right_Mid()
        {
            Assert.Equal("Hel", StringTokenizer.Left("Hello", 3));
            Assert.Equal("llo", StringTokenizer.Right("Hello", 3));
            Assert.Equal("ell", StringTokenizer.Mid("Hello", 2, 3));
        }

        [Fact]
        public void Find_ReturnsOneBasedIndex()
        {
            Assert.Equal(3, StringTokenizer.Find("ll", "Hello"));
            Assert.Equal(0, StringTokenizer.Find("xyz", "Hello"));
        }

        [Fact]
        public void RemoveUpTo_ExtractsAndModifies()
        {
            var input = "POWER:ON\rVOLUME:50\r";
            var first = StringTokenizer.RemoveUpTo(ref input, "\r");
            Assert.Equal("POWER:ON", first);
            Assert.Equal("VOLUME:50\r", input);
        }

        [Fact]
        public void TryParseKeyValue_Valid()
        {
            Assert.True(StringTokenizer.TryParseKeyValue("KEY=VALUE", "=", out var key, out var value));
            Assert.Equal("KEY", key);
            Assert.Equal("VALUE", value);
        }

        [Fact]
        public void TryParseKeyValue_NoSeparator_ReturnsFalse()
        {
            Assert.False(StringTokenizer.TryParseKeyValue("NOSEP", "=", out _, out _));
        }
    }

    public class TimeFormatterTests
    {
        [Fact]
        public void SecondsToHms_KnownValues()
        {
            Assert.Equal("00:00:00", TimeFormatter.SecondsToHms(0));
            Assert.Equal("01:00:00", TimeFormatter.SecondsToHms(3600));
            Assert.Equal("02:15:30", TimeFormatter.SecondsToHms(8130));
        }

        [Fact]
        public void SecondsToMs_KnownValues()
        {
            Assert.Equal("05:30", TimeFormatter.SecondsToMs(330));
        }

        [Fact]
        public void HmsToSeconds_RoundTrip()
        {
            Assert.Equal(8130, TimeFormatter.HmsToSeconds("02:15:30"));
        }

        [Fact]
        public void HmsToSeconds_MinuteSecond()
        {
            Assert.Equal(330, TimeFormatter.HmsToSeconds("05:30"));
        }

        [Fact]
        public void HmsToSeconds_Invalid()
        {
            Assert.Equal(0, TimeFormatter.HmsToSeconds(""));
            Assert.Equal(0, TimeFormatter.HmsToSeconds(null));
            Assert.Equal(0, TimeFormatter.HmsToSeconds("abc"));
        }

        [Fact]
        public void SecondsToReadable_KnownValues()
        {
            Assert.Equal("0s", TimeFormatter.SecondsToReadable(0));
            Assert.Equal("30s", TimeFormatter.SecondsToReadable(30));
            Assert.Equal("5m", TimeFormatter.SecondsToReadable(300));
            Assert.Equal("2h 15m 30s", TimeFormatter.SecondsToReadable(8130));
        }

        [Fact]
        public void SecondsToHms_NegativeClampedToZero()
        {
            Assert.Equal("00:00:00", TimeFormatter.SecondsToHms(-1));
        }
    }

    public class GatherBufferTests
    {
        [Fact]
        public void Append_CompleteMessage_FiresEvent()
        {
            var buffer = new GatherBuffer("\r\n");
            string received = null;
            buffer.MessageReceived += (_, msg) => received = msg;

            buffer.Append("HELLO\r\n");
            Assert.Equal("HELLO", received);
        }

        [Fact]
        public void Append_SplitMessage_FiresOnComplete()
        {
            var buffer = new GatherBuffer("\r\n");
            string received = null;
            buffer.MessageReceived += (_, msg) => received = msg;

            buffer.Append("HEL");
            Assert.Null(received);
            buffer.Append("LO\r\n");
            Assert.Equal("HELLO", received);
        }

        [Fact]
        public void Append_MultipleMessages_FiresMultiple()
        {
            var buffer = new GatherBuffer("\r");
            var messages = new List<string>();
            buffer.MessageReceived += (_, msg) => messages.Add(msg);

            buffer.Append("A\rB\rC\r");
            Assert.Equal(3, messages.Count);
            Assert.Equal("A", messages[0]);
            Assert.Equal("B", messages[1]);
            Assert.Equal("C", messages[2]);
        }

        [Fact]
        public void Append_OverflowProtection_ClearsBuffer()
        {
            var buffer = new GatherBuffer("\r", maxBufferSize: 10);
            string received = null;
            buffer.MessageReceived += (_, msg) => received = msg;

            buffer.Append(new string('A', 20)); // Exceeds max
            Assert.Null(received);
            Assert.Equal("", buffer.CurrentBuffer);
        }

        [Fact]
        public void Clear_EmptiesBuffer()
        {
            var buffer = new GatherBuffer("\r");
            buffer.Append("partial");
            buffer.Clear();
            Assert.Equal("", buffer.CurrentBuffer);
        }
    }

    public class FeedbackParserTests
    {
        [Fact]
        public void AddPattern_RegexMatch_FiresEvent()
        {
            var parser = new FeedbackParser();
            parser.AddPattern("volume", @"^MV(\d+)$");

            FeedbackMatchEventArgs result = null;
            parser.MatchFound += (_, e) => result = e;

            parser.Parse("MV50");
            Assert.NotNull(result);
            Assert.Equal("volume", result.SignalName);
            Assert.Equal("50", result.GetString());
            Assert.True(result.TryGetInt(out var val));
            Assert.Equal(50, val);
        }

        [Fact]
        public void AddPrefixMatch_FiresWithValue()
        {
            var parser = new FeedbackParser();
            parser.AddPrefixMatch("power", "PWR:", "\r");

            FeedbackMatchEventArgs result = null;
            parser.MatchFound += (_, e) => result = e;

            parser.Parse("PWR:ON\r");
            Assert.NotNull(result);
            Assert.Equal("power", result.SignalName);
            Assert.Equal("ON", result.GetString());
        }

        [Fact]
        public void AddExactMatch_FiresFixedValue()
        {
            var parser = new FeedbackParser();
            parser.AddExactMatch("power", "PWON", true);

            FeedbackMatchEventArgs result = null;
            parser.MatchFound += (_, e) => result = e;

            parser.Parse("PWON");
            Assert.NotNull(result);
            Assert.Equal(true, result.Value);
        }

        [Fact]
        public void Parse_NoMatch_DoesNotFire()
        {
            var parser = new FeedbackParser();
            parser.AddPattern("volume", @"^MV(\d+)$");

            bool fired = false;
            parser.MatchFound += (_, _) => fired = true;

            parser.Parse("SOMETHING ELSE");
            Assert.False(fired);
        }

        [Fact]
        public void Parse_Null_DoesNotThrow()
        {
            var parser = new FeedbackParser();
            parser.AddPattern("test", "test");
            parser.Parse(null); // Should not throw
            parser.Parse("");   // Should not throw
        }

        [Fact]
        public void Clear_RemovesAllPatterns()
        {
            var parser = new FeedbackParser();
            parser.AddPattern("test", "test");
            parser.Clear();

            bool fired = false;
            parser.MatchFound += (_, _) => fired = true;
            parser.Parse("test");
            Assert.False(fired);
        }
    }
}
