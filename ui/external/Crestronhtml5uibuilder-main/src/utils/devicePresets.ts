import type { DevicePreset } from "../types/crestron";

export const devicePresets: DevicePreset[] = [
  { id: "TSW-1070-L", name: "TSW-1070 Landscape", width: 1920, height: 1080, orientation: "landscape" },
  { id: "TSW-1070-P", name: "TSW-1070 Portrait", width: 1080, height: 1920, orientation: "portrait" },
  { id: "TSW-770-L", name: "TSW-770 Landscape", width: 1280, height: 800, orientation: "landscape" },
  { id: "TSW-570-L", name: "TSW-570 Landscape", width: 1024, height: 600, orientation: "landscape" },
];
