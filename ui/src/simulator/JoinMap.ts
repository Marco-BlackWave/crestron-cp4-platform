/**
 * TypeScript JoinMap constants matching C# JoinMap.cs
 * Room join budget: 100 per type per room
 * System joins at offset 900+
 */
export const JoinMap = {
  JoinsPerRoom: 100,
  SystemOffset: 900,

  Digital: {
    PowerToggle: 0,
    PowerFeedback: 1,
    SourceSelect1: 2,
    SourceSelect2: 3,
    SourceSelect3: 4,
    SourceSelect4: 5,
    SourceSelect5: 6,
    SourceFeedback1: 7,
    SourceFeedback2: 8,
    SourceFeedback3: 9,
    SourceFeedback4: 10,
    SourceFeedback5: 11,
    VolumeUp: 12,
    VolumeDown: 13,
    MuteToggle: 14,
    MuteFeedback: 15,
    LightingScene1: 20,
    LightingScene2: 21,
    LightingScene3: 22,
    LightingScene4: 23,
    LightingSceneFb1: 24,
    LightingSceneFb2: 25,
    LightingSceneFb3: 26,
    LightingSceneFb4: 27,
    ShadeOpen: 30,
    ShadeClose: 31,
    ShadeStop: 32,
    HvacModeToggle: 40,
    HvacOnOff: 41,
    SecurityArmAway: 50,
    SecurityArmStay: 51,
    SecurityArmNight: 52,
    SecurityDisarm: 53,
    SecurityPanic: 54,
    SecurityStatusRequest: 55,
    SecurityArmedAwayFb: 56,
    SecurityArmedStayFb: 57,
    SecurityArmedNightFb: 58,
    SecurityDisarmedFb: 59,
    SecurityAlarmActiveFb: 60,
    SecurityTroubleFb: 61,
    SecurityReadyFb: 62,
    SecurityZone1Fb: 63,
    SecurityZone2Fb: 64,
    SecurityZone3Fb: 65,
    SecurityZone4Fb: 66,
    SecurityZone5Fb: 67,
    SecurityZone6Fb: 68,
    SecurityZone7Fb: 69,
    SecurityZone8Fb: 70,
  },

  Analog: {
    VolumeLevelFb: 0,
    VolumeSet: 1,
    LightingLevelFb: 2,
    LightingSet: 3,
    ShadePositionFb: 4,
    ShadeSet: 5,
    TempCurrent: 6,
    TempSetpointSet: 7,
    TempSetpointFb: 8,
  },

  Serial: {
    SourceName: 0,
    RoomName: 1,
    SceneName: 2,
    HvacMode: 3,
    StatusText: 4,
    SecurityArmMode: 5,
    SecurityStatus: 6,
    SecurityDisarmCode: 7,
  },

  SystemDigital: {
    AllOff: 0,
    SceneTrigger1: 1,
    SceneTrigger2: 2,
    SceneTrigger3: 3,
    SceneTrigger4: 4,
    SceneTrigger5: 5,
    SceneTrigger6: 6,
    SceneTrigger7: 7,
    SceneTrigger8: 8,
    SceneTrigger9: 9,
    SceneTrigger10: 10,
    SceneFb1: 11,
    SceneFb2: 12,
    SceneFb3: 13,
    SceneFb4: 14,
    SceneFb5: 15,
    SceneFb6: 16,
    SceneFb7: 17,
    SceneFb8: 18,
    SceneFb9: 19,
    SceneFb10: 20,
  },

  SystemSerial: {
    SystemStatus: 0,
    ActiveSceneName: 1,
  },

  /** Resolve absolute 1-based join number */
  resolve(roomOffset: number, joinOffset: number): number {
    return roomOffset + joinOffset + 1;
  },

  resolveSystem(joinOffset: number): number {
    return 900 + joinOffset + 1;
  },
} as const;
