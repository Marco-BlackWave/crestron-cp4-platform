using System;
using System.Collections.Generic;
using System.Threading;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Periodic polling scheduler for device status queries.
    /// Cycles through a list of poll commands at configurable interval.
    /// Ported from polling device SIMPL+ modules.
    /// </summary>
    public sealed class PollScheduler : IDisposable
    {
        private readonly ITransport _transport;
        private readonly List<string> _pollCommands = new List<string>();
        private readonly object _lock = new object();
        private Timer _timer;
        private int _currentIndex;
        private int _intervalMs;
        private bool _running;
        private bool _disposed;

        /// <summary>
        /// Create a poll scheduler.
        /// </summary>
        /// <param name="transport">Transport to send poll commands</param>
        /// <param name="intervalMs">Interval between polls in ms (default 5000)</param>
        public PollScheduler(ITransport transport, int intervalMs = 5000)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _intervalMs = intervalMs > 0 ? intervalMs : 5000;
        }

        /// <summary>
        /// Add a poll command to the cycle.
        /// </summary>
        public void AddCommand(string command)
        {
            if (string.IsNullOrEmpty(command)) return;
            lock (_lock) _pollCommands.Add(command);
        }

        /// <summary>
        /// Add multiple poll commands.
        /// </summary>
        public void AddCommands(IEnumerable<string> commands)
        {
            if (commands == null) return;
            lock (_lock)
            {
                foreach (var cmd in commands)
                {
                    if (!string.IsNullOrEmpty(cmd))
                        _pollCommands.Add(cmd);
                }
            }
        }

        /// <summary>
        /// Start polling.
        /// </summary>
        public void Start()
        {
            lock (_lock)
            {
                if (_running || _pollCommands.Count == 0) return;
                _running = true;
                _currentIndex = 0;
                if (_timer == null)
                    _timer = new Timer(OnPollTick, null, 0, _intervalMs);
                else
                    _timer.Change(0, _intervalMs);
            }
        }

        /// <summary>
        /// Stop polling.
        /// </summary>
        public void Stop()
        {
            lock (_lock)
            {
                _running = false;
                _timer?.Change(Timeout.Infinite, Timeout.Infinite);
            }
        }

        /// <summary>
        /// Change poll interval.
        /// </summary>
        public void SetInterval(int intervalMs)
        {
            lock (_lock)
            {
                _intervalMs = intervalMs > 0 ? intervalMs : 5000;
                if (_running)
                    _timer?.Change(_intervalMs, _intervalMs);
            }
        }

        /// <summary>
        /// Clear all poll commands and stop.
        /// </summary>
        public void Clear()
        {
            lock (_lock)
            {
                Stop();
                _pollCommands.Clear();
            }
        }

        private void OnPollTick(object state)
        {
            lock (_lock)
            {
                if (!_running || _disposed || _pollCommands.Count == 0) return;
                if (!_transport.IsConnected) return;

                var cmd = _pollCommands[_currentIndex];
                _currentIndex = (_currentIndex + 1) % _pollCommands.Count;

                try { _transport.Send(cmd); } catch { }
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _timer?.Dispose();
            lock (_lock) _pollCommands.Clear();
        }
    }
}
