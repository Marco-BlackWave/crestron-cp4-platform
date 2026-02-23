using System;
using System.Threading;

namespace CrestronCP4.ProcessorSide.Utilities
{
    /// <summary>
    /// Smooth volume ramping with configurable step size and interval.
    /// Thread-safe for use with Crestron button press/release events.
    /// Ported from multiple volume control SIMPL+ modules.
    /// </summary>
    public sealed class VolumeRamp : IDisposable
    {
        private readonly object _lock = new object();
        private Timer _rampTimer;
        private int _currentLevel;
        private int _targetLevel;
        private int _stepSize;
        private int _intervalMs;
        private int _minLevel;
        private int _maxLevel;
        private bool _isRamping;
        private bool _disposed;

        public event EventHandler<int> LevelChanged;

        public int CurrentLevel
        {
            get { lock (_lock) return _currentLevel; }
        }

        public bool IsRamping
        {
            get { lock (_lock) return _isRamping; }
        }

        /// <summary>
        /// Create a volume ramp controller.
        /// </summary>
        /// <param name="minLevel">Minimum level (default 0)</param>
        /// <param name="maxLevel">Maximum level (default 65535 for Crestron analog)</param>
        /// <param name="stepSize">Step per tick (default 655, ~1% of 65535)</param>
        /// <param name="intervalMs">Ramp interval in ms (default 50)</param>
        public VolumeRamp(int minLevel = 0, int maxLevel = 65535, int stepSize = 655, int intervalMs = 50)
        {
            _minLevel = minLevel;
            _maxLevel = maxLevel;
            _stepSize = stepSize > 0 ? stepSize : 655;
            _intervalMs = intervalMs > 0 ? intervalMs : 50;
        }

        /// <summary>
        /// Start ramping up. Call on button press.
        /// </summary>
        public void StartRampUp()
        {
            lock (_lock)
            {
                _targetLevel = _maxLevel;
                StartRamp();
            }
        }

        /// <summary>
        /// Start ramping down. Call on button press.
        /// </summary>
        public void StartRampDown()
        {
            lock (_lock)
            {
                _targetLevel = _minLevel;
                StartRamp();
            }
        }

        /// <summary>
        /// Stop ramping. Call on button release.
        /// </summary>
        public void StopRamp()
        {
            lock (_lock)
            {
                _isRamping = false;
                _rampTimer?.Change(Timeout.Infinite, Timeout.Infinite);
            }
        }

        /// <summary>
        /// Set level directly (no ramping).
        /// </summary>
        public void SetLevel(int level)
        {
            lock (_lock)
            {
                _currentLevel = Clamp(level);
                _isRamping = false;
                _rampTimer?.Change(Timeout.Infinite, Timeout.Infinite);
            }
            LevelChanged?.Invoke(this, _currentLevel);
        }

        /// <summary>
        /// Ramp to a specific target level.
        /// </summary>
        public void RampTo(int target)
        {
            lock (_lock)
            {
                _targetLevel = Clamp(target);
                if (_targetLevel == _currentLevel) return;
                StartRamp();
            }
        }

        private void StartRamp()
        {
            _isRamping = true;
            if (_rampTimer == null)
                _rampTimer = new Timer(OnRampTick, null, 0, _intervalMs);
            else
                _rampTimer.Change(0, _intervalMs);
        }

        private void OnRampTick(object state)
        {
            lock (_lock)
            {
                if (!_isRamping || _disposed) return;

                if (_currentLevel < _targetLevel)
                {
                    _currentLevel = Math.Min(_currentLevel + _stepSize, _targetLevel);
                }
                else if (_currentLevel > _targetLevel)
                {
                    _currentLevel = Math.Max(_currentLevel - _stepSize, _targetLevel);
                }

                if (_currentLevel == _targetLevel)
                {
                    _isRamping = false;
                    _rampTimer?.Change(Timeout.Infinite, Timeout.Infinite);
                }
            }

            LevelChanged?.Invoke(this, _currentLevel);
        }

        private int Clamp(int value)
        {
            if (value < _minLevel) return _minLevel;
            if (value > _maxLevel) return _maxLevel;
            return value;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _rampTimer?.Dispose();
        }
    }
}
