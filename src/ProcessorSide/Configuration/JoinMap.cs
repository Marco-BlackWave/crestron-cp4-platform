namespace CrestronCP4.ProcessorSide.Configuration
{
    /// <summary>
    /// Standardized join offset constants for the room-based join map.
    /// Each room gets 100 joins per type. System-wide joins start at 900.
    /// </summary>
    public static class JoinMap
    {
        public const int JoinsPerRoom = 100;
        public const int SystemOffset = 900;

        // Digital join offsets (per room)
        public static class Digital
        {
            public const int PowerToggle = 0;
            public const int PowerFeedback = 1;
            public const int SourceSelect1 = 2;
            public const int SourceSelect2 = 3;
            public const int SourceSelect3 = 4;
            public const int SourceSelect4 = 5;
            public const int SourceSelect5 = 6;
            public const int SourceFeedback1 = 7;
            public const int SourceFeedback2 = 8;
            public const int SourceFeedback3 = 9;
            public const int SourceFeedback4 = 10;
            public const int SourceFeedback5 = 11;
            public const int VolumeUp = 12;
            public const int VolumeDown = 13;
            public const int MuteToggle = 14;
            public const int MuteFeedback = 15;
            public const int PowerOn = 16;
            public const int PowerOff = 17;
            public const int MediaPlayPause = 18;
            public const int MediaStop = 19;
            public const int LightingScene1 = 20;
            public const int LightingScene2 = 21;
            public const int LightingScene3 = 22;
            public const int LightingScene4 = 23;
            public const int LightingSceneFb1 = 24;
            public const int LightingSceneFb2 = 25;
            public const int LightingSceneFb3 = 26;
            public const int LightingSceneFb4 = 27;
            public const int ShadeOpen = 30;
            public const int ShadeClose = 31;
            public const int ShadeStop = 32;
            public const int HvacModeToggle = 40;
            public const int HvacOnOff = 41;

            // Security inputs (panel → program)
            public const int SecurityArmAway = 50;
            public const int SecurityArmStay = 51;
            public const int SecurityArmNight = 52;
            public const int SecurityDisarm = 53;
            public const int SecurityPanic = 54;
            public const int SecurityStatusRequest = 55;

            // Security outputs (program → panel feedback)
            public const int SecurityArmedAwayFb = 56;
            public const int SecurityArmedStayFb = 57;
            public const int SecurityArmedNightFb = 58;
            public const int SecurityDisarmedFb = 59;
            public const int SecurityAlarmActiveFb = 60;
            public const int SecurityTroubleFb = 61;
            public const int SecurityReadyFb = 62;
            public const int SecurityZone1Fb = 63;
            public const int SecurityZone2Fb = 64;
            public const int SecurityZone3Fb = 65;
            public const int SecurityZone4Fb = 66;
            public const int SecurityZone5Fb = 67;
            public const int SecurityZone6Fb = 68;
            public const int SecurityZone7Fb = 69;
            public const int SecurityZone8Fb = 70;

            // Media remote controls (Apple TV / streaming transport)
            public const int MediaUp = 71;
            public const int MediaDown = 72;
            public const int MediaLeft = 73;
            public const int MediaRight = 74;
            public const int MediaSelect = 75;
            public const int MediaMenu = 76;
            public const int MediaHome = 77;
            public const int MediaNext = 78;
            public const int MediaPrevious = 79;
        }

        // Analog join offsets (per room)
        public static class Analog
        {
            public const int VolumeLevelFeedback = 0;
            public const int VolumeSet = 1;
            public const int LightingLevelFeedback = 2;
            public const int LightingSet = 3;
            public const int ShadePositionFeedback = 4;
            public const int ShadeSet = 5;
            public const int TempCurrent = 6;
            public const int TempSetpointSet = 7;
            public const int TempSetpointFeedback = 8;
        }

        // Serial join offsets (per room)
        public static class Serial
        {
            public const int SourceName = 0;
            public const int RoomName = 1;
            public const int SceneName = 2;
            public const int HvacMode = 3;
            public const int StatusText = 4;
            public const int SecurityArmMode = 5;
            public const int SecurityStatus = 6;
            public const int SecurityDisarmCode = 7;
        }

        // System-wide digital join offsets (added to SystemOffset)
        public static class SystemDigital
        {
            public const int AllOff = 0;
            public const int SceneTrigger1 = 1;
            public const int SceneTrigger2 = 2;
            public const int SceneTrigger3 = 3;
            public const int SceneTrigger4 = 4;
            public const int SceneTrigger5 = 5;
            public const int SceneTrigger6 = 6;
            public const int SceneTrigger7 = 7;
            public const int SceneTrigger8 = 8;
            public const int SceneTrigger9 = 9;
            public const int SceneTrigger10 = 10;
            public const int SceneFeedback1 = 11;
            public const int SceneFeedback2 = 12;
            public const int SceneFeedback3 = 13;
            public const int SceneFeedback4 = 14;
            public const int SceneFeedback5 = 15;
            public const int SceneFeedback6 = 16;
            public const int SceneFeedback7 = 17;
            public const int SceneFeedback8 = 18;
            public const int SceneFeedback9 = 19;
            public const int SceneFeedback10 = 20;
        }

        // System-wide serial join offsets (added to SystemOffset)
        public static class SystemSerial
        {
            public const int SystemStatus = 0;
            public const int ActiveSceneName = 1;
        }

        /// <summary>
        /// Resolves an absolute join number from a room's offset and a relative join offset.
        /// Join numbers are 1-based, so we add 1 to the combined offset.
        /// </summary>
        public static ushort Resolve(int roomOffset, int joinOffset)
        {
            return (ushort)(roomOffset + joinOffset + 1);
        }

        /// <summary>
        /// Resolves an absolute system join number from a system join offset.
        /// </summary>
        public static ushort ResolveSystem(int joinOffset)
        {
            return (ushort)(SystemOffset + joinOffset);
        }
    }
}
