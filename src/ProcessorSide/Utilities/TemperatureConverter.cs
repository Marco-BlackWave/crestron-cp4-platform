namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Celsius/Fahrenheit conversion with Crestron 10x analog scaling.
    /// Crestron convention: analog values are 10x actual (e.g., 225 = 22.5°C).
    /// Ported from temperature converter SIMPL+ modules.
    /// </summary>
    public static class TemperatureConverter
    {
        /// <summary>
        /// Convert Celsius to Fahrenheit.
        /// </summary>
        public static double CelsiusToFahrenheit(double celsius)
        {
            return (celsius * 9.0 / 5.0) + 32.0;
        }

        /// <summary>
        /// Convert Fahrenheit to Celsius.
        /// </summary>
        public static double FahrenheitToCelsius(double fahrenheit)
        {
            return (fahrenheit - 32.0) * 5.0 / 9.0;
        }

        /// <summary>
        /// Convert Crestron 10x analog value to actual Celsius.
        /// Example: 225 → 22.5°C
        /// </summary>
        public static double AnalogToCelsius(int analogValue)
        {
            return analogValue / 10.0;
        }

        /// <summary>
        /// Convert actual Celsius to Crestron 10x analog value.
        /// Example: 22.5°C → 225
        /// </summary>
        public static int CelsiusToAnalog(double celsius)
        {
            return (int)(celsius * 10.0);
        }

        /// <summary>
        /// Convert Crestron 10x Celsius analog to Fahrenheit analog (also 10x).
        /// </summary>
        public static int AnalogCelsiusToAnalogFahrenheit(int celsiusAnalog)
        {
            var celsius = celsiusAnalog / 10.0;
            var fahrenheit = CelsiusToFahrenheit(celsius);
            return (int)(fahrenheit * 10.0);
        }

        /// <summary>
        /// Convert Crestron 10x Fahrenheit analog to Celsius analog (also 10x).
        /// </summary>
        public static int AnalogFahrenheitToAnalogCelsius(int fahrenheitAnalog)
        {
            var fahrenheit = fahrenheitAnalog / 10.0;
            var celsius = FahrenheitToCelsius(fahrenheit);
            return (int)(celsius * 10.0);
        }
    }
}
