using System;
using Crestron.SimplSharp;
using Crestron.SimplSharp.ErrorLog;
using CrestronCP4.ProcessorSide.Core.Diagnostics;

namespace CrestronCP4.ProcessorSide.Infrastructure
{
    public sealed class CrestronLogger : ILogger
    {
        public void Info(string message)
        {
            CrestronConsole.PrintLine("[{0}] INFO: {1}", DateTime.Now.ToString("HH:mm:ss"), message);
        }

        public void Warn(string message)
        {
            CrestronConsole.PrintLine("[{0}] WARN: {1}", DateTime.Now.ToString("HH:mm:ss"), message);
        }

        public void Error(string message)
        {
            CrestronConsole.PrintLine("[{0}] ERROR: {1}", DateTime.Now.ToString("HH:mm:ss"), message);

            try
            {
                ErrorLog.Error(message ?? "(null)");
            }
            catch
            {
                // Prevent logging errors from masking the original error
            }
        }
    }
}
