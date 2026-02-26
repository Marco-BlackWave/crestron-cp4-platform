using Crestron.SimplSharp.CrestronIO;

namespace CrestronCP4.ProcessorSide.Infrastructure
{
    public sealed class CrestronFileSystem : IFileSystem
    {
        public bool FileExists(string path)
        {
            return File.Exists(path);
        }

        public string ReadAllText(string path)
        {
            return File.ReadAllText(path);
        }

        public void WriteAllText(string path, string content)
        {
            File.WriteAllText(path, content);
        }
    }
}
