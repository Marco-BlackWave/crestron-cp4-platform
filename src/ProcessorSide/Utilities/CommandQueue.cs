using System;
using System.Collections.Generic;
using System.Threading;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Thread-safe command queue with busy handshake and timeout.
    /// Ensures only one command is in-flight at a time (required by many serial/TCP devices).
    /// Ported from Epson TCP, matrix, and similar SIMPL+ modules.
    /// </summary>
    public sealed class CommandQueue : IDisposable
    {
        private readonly Queue<QueuedCommand> _queue = new Queue<QueuedCommand>();
        private readonly object _lock = new object();
        private readonly ITransport _transport;
        private readonly int _timeoutMs;
        private readonly int _delayBetweenMs;
        private Timer _timeoutTimer;
        private Timer _delayTimer;
        private bool _busy;
        private bool _disposed;

        /// <summary>
        /// Create a command queue for a transport.
        /// </summary>
        /// <param name="transport">Transport to send commands through</param>
        /// <param name="timeoutMs">Timeout per command in ms (default 3000)</param>
        /// <param name="delayBetweenMs">Delay between commands in ms (default 100)</param>
        public CommandQueue(ITransport transport, int timeoutMs = 3000, int delayBetweenMs = 100)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _timeoutMs = timeoutMs > 0 ? timeoutMs : 3000;
            _delayBetweenMs = delayBetweenMs >= 0 ? delayBetweenMs : 100;
        }

        /// <summary>
        /// Enqueue a string command.
        /// </summary>
        public void Enqueue(string command)
        {
            if (string.IsNullOrEmpty(command)) return;
            lock (_lock)
            {
                _queue.Enqueue(new QueuedCommand { StringData = command });
                if (!_busy) SendNext();
            }
        }

        /// <summary>
        /// Enqueue a byte[] command.
        /// </summary>
        public void Enqueue(byte[] command)
        {
            if (command == null || command.Length == 0) return;
            lock (_lock)
            {
                _queue.Enqueue(new QueuedCommand { ByteData = command });
                if (!_busy) SendNext();
            }
        }

        /// <summary>
        /// Signal that a response has been received (releases the busy flag).
        /// Call this from the device's OnDataReceived handler.
        /// </summary>
        public void ResponseReceived()
        {
            lock (_lock)
            {
                _busy = false;
                _timeoutTimer?.Change(Timeout.Infinite, Timeout.Infinite);

                if (_queue.Count > 0)
                {
                    if (_delayBetweenMs > 0)
                    {
                        // Delay before sending next command
                        if (_delayTimer == null)
                            _delayTimer = new Timer(OnDelayElapsed, null, _delayBetweenMs, Timeout.Infinite);
                        else
                            _delayTimer.Change(_delayBetweenMs, Timeout.Infinite);
                    }
                    else
                    {
                        SendNext();
                    }
                }
            }
        }

        /// <summary>
        /// Clear all pending commands.
        /// </summary>
        public void Clear()
        {
            lock (_lock)
            {
                _queue.Clear();
                _busy = false;
                _timeoutTimer?.Change(Timeout.Infinite, Timeout.Infinite);
            }
        }

        /// <summary>
        /// Number of commands waiting in queue.
        /// </summary>
        public int PendingCount
        {
            get { lock (_lock) return _queue.Count; }
        }

        private void SendNext()
        {
            if (_queue.Count == 0) return;

            var cmd = _queue.Dequeue();
            _busy = true;

            if (cmd.StringData != null)
                _transport.Send(cmd.StringData);
            else if (cmd.ByteData != null)
                _transport.Send(cmd.ByteData);

            // Start timeout
            if (_timeoutTimer == null)
                _timeoutTimer = new Timer(OnTimeout, null, _timeoutMs, Timeout.Infinite);
            else
                _timeoutTimer.Change(_timeoutMs, Timeout.Infinite);
        }

        private void OnTimeout(object state)
        {
            lock (_lock)
            {
                if (!_busy) return;
                _busy = false;
                // Timeout: move to next command
                if (_queue.Count > 0) SendNext();
            }
        }

        private void OnDelayElapsed(object state)
        {
            lock (_lock)
            {
                if (!_busy && _queue.Count > 0) SendNext();
            }
        }

        private sealed class QueuedCommand
        {
            public string StringData;
            public byte[] ByteData;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _timeoutTimer?.Dispose();
            _delayTimer?.Dispose();
            lock (_lock) _queue.Clear();
        }
    }
}
