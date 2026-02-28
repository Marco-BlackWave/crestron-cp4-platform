namespace JoinListApi.Services;

internal sealed class LockedFileStore
{
    private readonly SemaphoreSlim _lock;

    public LockedFileStore(SemaphoreSlim @lock)
    {
        _lock = @lock;
    }

    public async Task<string> ReadAllTextAsync(string path)
    {
        await _lock.WaitAsync();
        try
        {
            return await File.ReadAllTextAsync(path);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task AtomicWriteAsync(string path, string content)
    {
        await _lock.WaitAsync();
        try
        {
            var tempPath = path + ".tmp";
            await File.WriteAllTextAsync(tempPath, content);
            File.Move(tempPath, path, overwrite: true);
        }
        finally
        {
            _lock.Release();
        }
    }
}
