import type { ScaffoldRequest } from "../api/scaffoldSystemConfig";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  request: ScaffoldRequest;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "residential-core",
    name: "Residential Core",
    description: "2-floor residence with AV, lighting, shades and technical rack.",
    request: {
      systemName: "Residential Core",
      tasks: ["Core AV + lighting setup", "Shades baseline", "Rack integration"],
      integrations: ["Lutron QSX", "BACnet"],
      processors: [{ id: "main", processor: "CP4", eiscIpId: "0x03", eiscIpAddress: "192.168.1.10" }],
      rooms: [
        { name: "Living Room", subsystems: ["av", "lighting", "shades"], roomType: "standard", processorId: "main" },
        { name: "Kitchen", subsystems: ["av", "lighting"], roomType: "standard", processorId: "main" },
        { name: "Master Bedroom", subsystems: ["av", "lighting", "shades"], roomType: "standard", processorId: "main" },
        { name: "Equipment Rack", roomType: "technical", processorId: "main" },
      ],
    },
  },
  {
    id: "yacht-multi-zone",
    name: "Yacht Multi-Zone",
    description: "Marine profile with distributed zones and centralized technical rooms.",
    request: {
      systemName: "Yacht Multi-Zone",
      tasks: ["Marine distributed audio", "Bridge controls", "Cabin scenes"],
      integrations: ["KNX", "Lutron QS Telnet"],
      processors: [
        { id: "bridge", processor: "CP4", eiscIpId: "0x03", eiscIpAddress: "10.0.0.20" },
        { id: "aft", processor: "RMC4", eiscIpId: "0x04", eiscIpAddress: "10.0.0.21" },
      ],
      rooms: [
        { name: "Bridge", subsystems: ["av", "lighting", "security"], roomType: "standard", processorId: "bridge" },
        { name: "Main Salon", subsystems: ["av", "lighting", "shades"], roomType: "standard", processorId: "bridge" },
        { name: "Guest Cabin", subsystems: ["av", "lighting", "hvac"], roomType: "standard", processorId: "aft" },
        { name: "Aft Rack", roomType: "technical", processorId: "aft" },
      ],
    },
  },
  {
    id: "commercial-campus",
    name: "Commercial Campus",
    description: "Conference-heavy layout with KNX/BACnet backbone and central operations.",
    request: {
      systemName: "Commercial Campus",
      tasks: ["Meeting room standard package", "Campus scheduling", "Ops monitoring"],
      integrations: ["BACnet", "KNX", "Lutron QSX"],
      processors: [{ id: "core", processor: "CP4", eiscIpId: "0x03", eiscIpAddress: "172.16.1.10" }],
      rooms: [
        { name: "Conference A", subsystems: ["av", "lighting"], roomType: "standard", processorId: "core" },
        { name: "Conference B", subsystems: ["av", "lighting"], roomType: "standard", processorId: "core" },
        { name: "Boardroom", subsystems: ["av", "lighting", "security"], roomType: "standard", processorId: "core" },
        { name: "Operations", subsystems: ["security", "hvac"], roomType: "standard", processorId: "core" },
        { name: "Main Technical", roomType: "technical", processorId: "core" },
      ],
    },
  },
];
