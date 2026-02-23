using System;
using System.Threading;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Reconnect/retry logic with exponential backoff.
    /// Monitors an ITransport and automatically reconnects on disconnect.
    /// Ported from TCP connection SIMPL+ modules.
    /// </summary>
    public sealed class RetryHandler : IDisposable
    {
        private readonly ITransport _transport;
        private readonly ILogger _logger;
        private readonly int _initialDelayMs;
        private readonly int _maxDelayMs;
        private readonly int _maxRetries;
        private Timer _retryTimer;
        private int _currentDelay;
        private int _retryCount;
        private bool _enabled;
        private bool _disposed;
        private readonly object _lock = new object();

        public event EventHandler Connected;
        public event EventHandler Disconnected;
        public event EventHandler MaxRetriesReached;

        /// <summary>
        /// Create a retry handler.
        /// </summary>
        /// <param name="transport">Transport to monitor and reconnect</param>
        /// <param name="logger">Logger</param>
        /// <param name="initialDelayMs">Initial retry delay in ms (default 1000)</param>
        /// <param name="maxDelayMs">Maximum retry delay in ms (default 60000)</param>
        /// <param name="maxRetries">Maximum retry attempts, 0 for unlimited (default 0)</param>
        public RetryHandler(ITransport transport, ILogger logger,
            int initialDelayMs = 1000, int maxDelayMs = 60000, int maxRetries = 0)
        {
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _initialDelayMs = initialDelayMs > 0 ? initialDelayMs : 1000;
            _maxDelayMs = maxDelayMs > 0 ? maxDelayMs : 60000;
            _maxRetries = maxRetries;
        }

        /// <summary>
        /// Enable auto-reconnect and make initial connection.
        /// </summary>
        public void Enable()
        {
            lock (_lock)
            {
                _enabled = true;
                _retryCount = 0;
                _currentDelay = _initialDelayMs;
            }
            TryConnect();
        }

        /// <summary>
        /// Disable auto-reconnect.
        /// </summary>
        public void Disable()
        {
            lock (_lock)
            {
                _enabled = false;
                _retryTimer?.Change(Timeout.Infinite, Timeout.Infinite);
            }
        }

        /// <summary>
        /// Call this when the transport reports disconnection.
        /// </summary>
        public void OnDisconnected()
        {
            Disconnected?.Invoke(this, EventArgs.Empty);
            ScheduleRetry();
        }

        /// <summary>
        /// Call this when the transport successfully connects.
        /// </summary>
        public void OnConnected()
        {
            lock (_lock)
            {
                _retryCount = 0;
                _currentDelay = _initialDelayMs;
                _retryTimer?.Change(Timeout.Infinite, Timeout.Infinite);
            }
            Connected?.Invoke(this, EventArgs.Empty);
        }

        /// <summary>
        /// Reset retry count and delay.
        /// </summary>
        public void Reset()
        {
            lock (_lock)
            {
                _retryCount = 0;
                _currentDelay = _initialDelayMs;
            }
        }

        public int RetryCount
        {
            get { lock (_lock) return _retryCount; }
        }

        private void ScheduleRetry()
        {
            lock (_lock)
            {
                if (!_enabled || _disposed) return;

                if (_maxRetries > 0 && _retryCount >= _maxRetries)
                {
                    _logger.Error("RetryHandler: max retries (" + _maxRetries + ") reached for " + _transport.Id);
                    MaxRetriesReached?.Invoke(this, EventArgs.Empty);
                    return;
                }

                _logger.Info("RetryHandler: retry " + (_retryCount + 1) + " in " + _currentDelay + "ms for " + _transport.Id);

                if (_retryTimer == null)
                    _retryTimer = new Timer(OnRetryTick, null, _currentDelay, Timeout.Infinite);
                else
                    _retryTimer.Change(_currentDelay, Timeout.Infinite);

                // Exponential backoff (double the delay, capped at max)
                _currentDelay = Math.Min(_currentDelay * 2, _maxDelayMs);
                _retryCount++;
            }
        }

        private void OnRetryTick(object state)
        {
            lock (_lock)
            {
                if (!_enabled || _disposed) return;
            }
            TryConnect();
        }

        private void TryConnect()
        {
            try
            {
                if (_transport.IsConnected)
                {
                    OnConnected();
                    return;
                }
                _transport.Connect();
                // Connection result is async; caller should invoke OnConnected/OnDisconnected
            }
            catch (Exception ex)
            {
                _logger.Error("RetryHandler: connect failed for " + _transport.Id + ": " + ex.Message);
                ScheduleRetry();
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _enabled = false;
            _retryTimer?.Dispose();
        }
    }
}
