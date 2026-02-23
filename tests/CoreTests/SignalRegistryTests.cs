using CrestronCP4.ProcessorSide.Core.Signals;

namespace CoreTests;

public class SignalRegistryTests
{
    [Fact]
    public void GetOrCreate_CreatesNewSignal()
    {
        var registry = new SignalRegistry();
        var signal = registry.GetOrCreate("test");

        Assert.NotNull(signal);
        Assert.Equal("test", signal.Name);
    }

    [Fact]
    public void GetOrCreate_ReturnsSameInstance()
    {
        var registry = new SignalRegistry();
        var first = registry.GetOrCreate("test");
        var second = registry.GetOrCreate("test");

        Assert.Same(first, second);
    }

    [Fact]
    public void GetOrCreate_NullName_ReturnsNull()
    {
        var registry = new SignalRegistry();
        Assert.Null(registry.GetOrCreate(null!));
    }

    [Fact]
    public void GetOrCreate_EmptyName_ReturnsNull()
    {
        var registry = new SignalRegistry();
        Assert.Null(registry.GetOrCreate(""));
    }

    [Fact]
    public void GetOrCreate_WhitespaceName_ReturnsNull()
    {
        var registry = new SignalRegistry();
        Assert.Null(registry.GetOrCreate("  "));
    }

    [Fact]
    public void GetOrCreate_DifferentNames_ReturnsDifferentSignals()
    {
        var registry = new SignalRegistry();
        var a = registry.GetOrCreate("alpha");
        var b = registry.GetOrCreate("beta");

        Assert.NotSame(a, b);
    }

    [Fact]
    public void ClearAll_RemovesAllSignals()
    {
        var registry = new SignalRegistry();
        var signal = registry.GetOrCreate("test");
        int fireCount = 0;
        signal.ValueChanged += (_, _) => fireCount++;

        registry.ClearAll();

        // Event handler should be cleared
        signal.Set("after-clear");
        Assert.Equal(0, fireCount);
    }

    [Fact]
    public void All_ReturnsRegisteredSignals()
    {
        var registry = new SignalRegistry();
        registry.GetOrCreate("a");
        registry.GetOrCreate("b");
        registry.GetOrCreate("c");

        var all = registry.All.ToList();
        Assert.Equal(3, all.Count);
    }

    [Fact]
    public async Task GetOrCreate_ThreadSafe_NoCrash()
    {
        var registry = new SignalRegistry();
        var tasks = new Task[50];

        for (int i = 0; i < tasks.Length; i++)
        {
            int id = i;
            tasks[i] = Task.Run(() =>
            {
                for (int j = 0; j < 100; j++)
                {
                    registry.GetOrCreate($"signal-{id}-{j}");
                }
            });
        }

        await Task.WhenAll(tasks);
        // No exception = success
        Assert.True(registry.All.Any());
    }
}
