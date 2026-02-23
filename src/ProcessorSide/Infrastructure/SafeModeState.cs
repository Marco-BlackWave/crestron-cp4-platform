using System.Threading;

namespace CrestronCP4.ProcessorSide.Infrastructure
{
    public sealed class SafeModeState
    {
        private int _isSafeMode;
        private string _reason;

        public bool IsSafeMode => Interlocked.CompareExchange(ref _isSafeMode, 0, 0) == 1;
        public string Reason => Volatile.Read(ref _reason);

        public void Enter(string reason)
        {
            Volatile.Write(ref _reason, reason);
            Interlocked.Exchange(ref _isSafeMode, 1);
        }
    }
}
