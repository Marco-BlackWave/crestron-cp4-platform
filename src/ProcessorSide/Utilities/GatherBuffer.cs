using System;
using System.Text;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Accumulates serial data until a delimiter is found, then fires event with complete message.
    /// Replaces SIMPL+ gather() function.
    /// Thread-safe for use with asynchronous serial/TCP data callbacks.
    /// </summary>
    public sealed class GatherBuffer
    {
        private readonly StringBuilder _buffer = new StringBuilder();
        private readonly object _lock = new object();
        private readonly string _delimiter;
        private readonly int _maxBufferSize;

        /// <summary>
        /// Fired when a complete message (up to and including delimiter) is gathered.
        /// </summary>
        public event EventHandler<string> MessageReceived;

        /// <summary>
        /// Create a gather buffer.
        /// </summary>
        /// <param name="delimiter">End-of-message delimiter (e.g., "\r\n", "\x03")</param>
        /// <param name="maxBufferSize">Maximum buffer size before auto-clear (default 16384)</param>
        public GatherBuffer(string delimiter, int maxBufferSize = 16384)
        {
            _delimiter = delimiter ?? throw new ArgumentNullException(nameof(delimiter));
            _maxBufferSize = maxBufferSize > 0 ? maxBufferSize : 16384;
        }

        /// <summary>
        /// Append received data. Fires MessageReceived for each complete message found.
        /// </summary>
        public void Append(string data)
        {
            if (string.IsNullOrEmpty(data)) return;

            lock (_lock)
            {
                _buffer.Append(data);

                // Overflow protection
                if (_buffer.Length > _maxBufferSize)
                {
                    _buffer.Clear();
                    return;
                }

                // Extract all complete messages
                ProcessBuffer();
            }
        }

        /// <summary>
        /// Clear the buffer.
        /// </summary>
        public void Clear()
        {
            lock (_lock) _buffer.Clear();
        }

        /// <summary>
        /// Current buffer contents (for debugging).
        /// </summary>
        public string CurrentBuffer
        {
            get { lock (_lock) return _buffer.ToString(); }
        }

        private void ProcessBuffer()
        {
            while (true)
            {
                var content = _buffer.ToString();
                var idx = content.IndexOf(_delimiter);
                if (idx < 0) break;

                var message = content.Substring(0, idx);
                _buffer.Remove(0, idx + _delimiter.Length);

                if (message.Length > 0)
                {
                    try
                    {
                        MessageReceived?.Invoke(this, message);
                    }
                    catch
                    {
                        // Don't let subscriber exceptions crash the buffer
                    }
                }
            }
        }
    }
}
