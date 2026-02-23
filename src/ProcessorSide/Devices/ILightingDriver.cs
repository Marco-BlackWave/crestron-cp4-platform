namespace CrestronCP4.ProcessorSide.Devices
{
    public interface ILightingDriver : IDeviceDriver
    {
        void SetLevel(string zoneId, int level);
        void RecallScene(string sceneId);
        int GetLevel(string zoneId);
    }
}
