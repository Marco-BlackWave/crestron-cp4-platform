using CrestronCP4.ProcessorSide.Core.Signals;

namespace CoreTests;

public class SignalTests
{
    [Fact]
    public void NewSignal_HasNullValue()
    {
        var signal = new Signal("test");
        Assert.Null(signal.Get());
    }

    [Fact]
    public void Set_UpdatesValue()
    {
        var signal = new Signal("test");
        signal.Set(true);
        Assert.Equal(true, signal.Get());
    }

    [Fact]
    public void Set_SameValue_DoesNotFireEvent()
    {
        var signal = new Signal("test");
        signal.Set(42);

        int fireCount = 0;
        signal.ValueChanged += (_, _) => fireCount++;
        signal.Set(42);

        Assert.Equal(0, fireCount);
    }

    [Fact]
    public void Set_DifferentValue_FiresEvent()
    {
        var signal = new Signal("test");
        SignalChangedEventArgs? captured = null;
        signal.ValueChanged += (_, args) => captured = args;

        signal.Set("hello");

        Assert.NotNull(captured);
        Assert.Equal("test", captured!.Name);
        Assert.Equal("hello", captured.Value);
    }

    [Fact]
    public void Set_MultipleChanges_FiresEachTime()
    {
        var signal = new Signal("test");
        int fireCount = 0;
        signal.ValueChanged += (_, _) => fireCount++;

        signal.Set(1);
        signal.Set(2);
        signal.Set(3);

        Assert.Equal(3, fireCount);
    }

    [Fact]
    public void ClearHandlers_RemovesAllSubscriptions()
    {
        var signal = new Signal("test");
        int fireCount = 0;
        signal.ValueChanged += (_, _) => fireCount++;

        signal.Set("first");
        Assert.Equal(1, fireCount);

        signal.ClearHandlers();
        signal.Set("second");
        Assert.Equal(1, fireCount);
    }

    [Fact]
    public void Name_IsPreserved()
    {
        var signal = new Signal("my-signal");
        Assert.Equal("my-signal", signal.Name);
    }

    [Fact]
    public async Task Set_ThreadSafe_NoCrash()
    {
        var signal = new Signal("concurrent");
        var tasks = new Task[100];

        for (int i = 0; i < tasks.Length; i++)
        {
            int value = i;
            tasks[i] = Task.Run(() =>
            {
                for (int j = 0; j < 100; j++)
                {
                    signal.Set(value * 100 + j);
                    signal.Get();
                }
            });
        }

        await Task.WhenAll(tasks);
        // No exception = success. Final value is indeterminate.
        Assert.NotNull(signal.Get());
    }
}
