import type { Project, CrestronElement } from "../types/crestron";

/**
 * Creates a Crestron Home dashboard template that mirrors the crestron-home app
 * as fully editable builder elements.
 * 
 * Layout (1920×1080):
 *   Header bar: 0,0 → 1920×56
 *   Sidebar:    0,56 → 208×1024
 *   Content:    208,56 → 1712×1024
 */
export function createCrestronHomeTemplate(
  width = 1920,
  height = 1080,
  device = "TSW-1070"
): Project {
  const HEADER_H = 56;
  const SIDEBAR_W = 208;
  const CONTENT_X = SIDEBAR_W;
  const CONTENT_Y = HEADER_H;
  const CONTENT_W = width - SIDEBAR_W;
  const CONTENT_H = height - HEADER_H;

  // --- Overview Dashboard page ---
  const homePage: { id: string; name: string; width: number; height: number; backgroundColor: string; elements: CrestronElement[] } = {
    id: "home",
    name: "Home",
    width,
    height,
    backgroundColor: "#0a0e1a",
    elements: [
      // ──────── HEADER BAR ────────
      {
        id: "hdr-bg",
        type: "button",
        name: "Header Background",
        x: 0, y: 0, width, height: HEADER_H,
        style: { background: "rgba(255,255,255,0.04)", borderRadius: 0, borderWidth: 0 },
      },
      {
        id: "hdr-title",
        type: "text",
        name: "Header Title",
        text: "Crestron Home",
        x: 52, y: 14, width: 140, height: 28,
        style: { textColor: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "Inter, sans-serif", background: "transparent" },
      },
      {
        id: "hdr-clock",
        type: "text",
        name: "Clock",
        text: "14:30",
        x: width - 320, y: 16, width: 50, height: 24,
        style: { textColor: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter, sans-serif", background: "transparent" },
      },
      {
        id: "hdr-date",
        type: "text",
        name: "Date",
        text: "Thursday, Feb 27",
        x: width - 260, y: 16, width: 130, height: 24,
        style: { textColor: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter, sans-serif", background: "transparent" },
      },
      {
        id: "hdr-wifi",
        type: "button",
        name: "WiFi Status",
        icon: "Waves",
        x: width - 110, y: 12, width: 32, height: 32,
        style: { background: "transparent", textColor: "rgba(52,211,153,0.6)", borderRadius: 8 },
      },
      {
        id: "hdr-notif",
        type: "button",
        name: "Notifications",
        icon: "Hash",
        x: width - 70, y: 12, width: 32, height: 32,
        style: { background: "rgba(255,255,255,0.06)", textColor: "rgba(255,255,255,0.4)", borderRadius: 8 },
      },

      // ──────── SIDEBAR ────────
      {
        id: "sidebar-bg",
        type: "button",
        name: "Sidebar Background",
        x: 0, y: HEADER_H, width: SIDEBAR_W, height: CONTENT_H,
        style: { background: "rgba(255,255,255,0.02)", borderRadius: 0, borderWidth: 0 },
      },
      // Section buttons
      ...makeSidebarButton("sb-overview", "Overview", "LayoutGrid", 0, true),
      ...makeSidebarButton("sb-techctrl", "Tech Control", "Wrench", 1, false),
      ...makeSidebarButton("sb-audio", "Audio", "Music", 2, false),
      ...makeSidebarButton("sb-video", "Video", "Tv", 3, false),
      ...makeSidebarButton("sb-security", "Security", "Shield", 4, false),
      ...makeSidebarButton("sb-keypad", "Keypad", "Lock", 5, false),
      ...makeSidebarButton("sb-calendar", "Calendar", "CalendarDays", 6, false),
      ...makeSidebarButton("sb-settings", "Settings", "Wrench", 7, false),

      // Rooms label
      {
        id: "sb-rooms-label",
        type: "text",
        name: "Rooms Label",
        text: "ROOMS",
        x: 20, y: HEADER_H + 340, width: 160, height: 18,
        style: { textColor: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "Inter, sans-serif", background: "transparent" },
      },
      // Room buttons
      ...makeSidebarRoom("sb-living", "Living Room", "Home", 0),
      ...makeSidebarRoom("sb-kitchen", "Kitchen", "UtensilsCrossed", 1),
      ...makeSidebarRoom("sb-bedroom", "Master Bedroom", "Bed", 2),
      ...makeSidebarRoom("sb-cinema", "Cinema", "Sparkles", 3),
      ...makeSidebarRoom("sb-media", "Media Room", "Monitor", 4),
      ...makeSidebarRoom("sb-outdoor", "Outdoor", "TreePine", 5),

      // ──────── CONTENT AREA - OVERVIEW DASHBOARD ────────
      // Dashboard title
      {
        id: "dash-title",
        type: "text",
        name: "Dashboard Title",
        text: "Dashboard Overview",
        x: CONTENT_X + 24, y: CONTENT_Y + 16, width: 260, height: 32,
        style: { textColor: "#ffffff", fontSize: 20, fontFamily: "Inter, sans-serif", background: "transparent" },
      },

      // Row 1: Lighting + Climate + Power
      ...makeGlassCard("card-lighting", "Lighting", CONTENT_X + 24, CONTENT_Y + 64, 360, 300, {
        children: [
          makeCardLabel("light-label", "Living Room Lights", CONTENT_X + 44, CONTENT_Y + 84, 200),
          makeCardValue("light-val", "78%", CONTENT_X + 44, CONTENT_Y + 112, 60),
          makeDimmer("light-dim", CONTENT_X + 44, CONTENT_Y + 160, 320, 8),
          makeToggle("light-toggle", true, CONTENT_X + 290, CONTENT_Y + 84),
        ],
      }),
      ...makeGlassCard("card-climate", "Climate", CONTENT_X + 400, CONTENT_Y + 64, 360, 300, {
        children: [
          makeCardLabel("climate-label", "Temperature", CONTENT_X + 420, CONTENT_Y + 84, 140),
          makeCardValue("climate-val", "23°C", CONTENT_X + 420, CONTENT_Y + 112, 80),
          makeCardLabel("climate-hum", "Humidity: 45%", CONTENT_X + 420, CONTENT_Y + 148, 140),
          makeThermostatMini("climate-thermo", CONTENT_X + 580, CONTENT_Y + 84),
        ],
      }),
      ...makeGlassCard("card-power", "Power", CONTENT_X + 776, CONTENT_Y + 64, 360, 300, {
        children: [
          makeCardLabel("power-label", "Energy Usage", CONTENT_X + 796, CONTENT_Y + 84, 160),
          makeCardValue("power-val", "3.2 kW", CONTENT_X + 796, CONTENT_Y + 112, 100),
          makeGaugeBar("power-gauge", CONTENT_X + 796, CONTENT_Y + 160, 320, 12, 0.65),
          makeCardLabel("power-sub", "Solar: 1.8 kW", CONTENT_X + 796, CONTENT_Y + 190, 140),
        ],
      }),

      // Row 2: Media + Security + Biometric
      ...makeGlassCard("card-media", "Media", CONTENT_X + 24, CONTENT_Y + 380, 360, 300, {
        children: [
          makeCardLabel("media-artist", "Now Playing", CONTENT_X + 44, CONTENT_Y + 400, 140),
          makeCardLabel("media-track", "Midnight Dream", CONTENT_X + 44, CONTENT_Y + 424, 200),
          makeCardLabel("media-by", "Neon Atlas", CONTENT_X + 44, CONTENT_Y + 448, 120),
          makeMediaControls("media-ctrl", CONTENT_X + 44, CONTENT_Y + 500),
        ],
      }),
      ...makeGlassCard("card-security", "Security", CONTENT_X + 400, CONTENT_Y + 380, 360, 300, {
        children: [
          makeCardLabel("sec-label", "Security Status", CONTENT_X + 420, CONTENT_Y + 400, 160),
          makeCardValue("sec-val", "Armed • Home", CONTENT_X + 420, CONTENT_Y + 428, 160),
          makeStatusDot("sec-dot-front", "Front Door", true, CONTENT_X + 420, CONTENT_Y + 476),
          makeStatusDot("sec-dot-back", "Back Door", true, CONTENT_X + 420, CONTENT_Y + 504),
          makeStatusDot("sec-dot-garage", "Garage", false, CONTENT_X + 420, CONTENT_Y + 532),
        ],
      }),
      ...makeGlassCard("card-camera", "Camera", CONTENT_X + 776, CONTENT_Y + 380, 360, 300, {
        children: [
          makeCardLabel("cam-label", "Front Gate", CONTENT_X + 796, CONTENT_Y + 400, 160),
          {
            id: "cam-feed",
            type: "image",
            name: "Camera Feed",
            x: CONTENT_X + 796, y: CONTENT_Y + 432,
            width: 320, height: 220,
            style: { borderRadius: 8, background: "rgba(255,255,255,0.05)" },
          } as CrestronElement,
        ],
      }),

      // Right column: quick-access cards
      ...makeGlassCard("card-ac", "Air Conditioner", CONTENT_X + 1152, CONTENT_Y + 64, 530, 300, {
        children: [
          makeCardLabel("ac-label", "HVAC Control", CONTENT_X + 1172, CONTENT_Y + 84, 160),
          makeCardValue("ac-temp", "22°C", CONTENT_X + 1172, CONTENT_Y + 120, 80),
          {
            id: "ac-thermo",
            type: "mini-thermostat",
            name: "AC Thermostat",
            x: CONTENT_X + 1360, y: CONTENT_Y + 84,
            width: 160, height: 160,
            style: {},
          } as CrestronElement,
          makeToggle("ac-toggle", true, CONTENT_X + 1600, CONTENT_Y + 84),
        ],
      }),
      ...makeGlassCard("card-scenes", "Scenes", CONTENT_X + 1152, CONTENT_Y + 380, 530, 300, {
        children: [
          makeCardLabel("scene-label", "Quick Scenes", CONTENT_X + 1172, CONTENT_Y + 400, 160),
          makeSceneButton("scene-movie", "Movie Night", CONTENT_X + 1172, CONTENT_Y + 440, "#6366f1"),
          makeSceneButton("scene-dinner", "Dinner", CONTENT_X + 1342, CONTENT_Y + 440, "#f59e0b"),
          makeSceneButton("scene-party", "Party", CONTENT_X + 1172, CONTENT_Y + 510, "#ec4899"),
          makeSceneButton("scene-sleep", "Good Night", CONTENT_X + 1342, CONTENT_Y + 510, "#8b5cf6"),
        ],
      }),
    ],
  };

  // --- Audio page ---
  const audioPage = {
    id: "audio",
    name: "Audio",
    width,
    height,
    backgroundColor: "#0a0e1a",
    elements: [
      ...cloneHeaderSidebar("audio"),
      {
        id: "audio-title",
        type: "text" as const,
        name: "Audio Title",
        text: "Audio Control",
        x: CONTENT_X + 24, y: CONTENT_Y + 16, width: 200, height: 32,
        style: { textColor: "#ffffff", fontSize: 20, fontFamily: "Inter, sans-serif", background: "transparent" },
      },
      // Audio zones
      ...makeAudioZone("az-living", "Living Room", 1, CONTENT_X + 24, CONTENT_Y + 64),
      ...makeAudioZone("az-kitchen", "Kitchen", 2, CONTENT_X + 24, CONTENT_Y + 184),
      ...makeAudioZone("az-bedroom", "Master Bedroom", 3, CONTENT_X + 24, CONTENT_Y + 304),
      ...makeAudioZone("az-outdoor", "Outdoor", 4, CONTENT_X + 24, CONTENT_Y + 424),
      // Now Playing
      ...makeGlassCard("audio-now", "Now Playing", CONTENT_X + 900, CONTENT_Y + 64, 500, 400, {
        children: [
          makeCardLabel("audio-np-title", "Now Playing", CONTENT_X + 920, CONTENT_Y + 84, 200),
          makeCardValue("audio-np-track", "Midnight Dream", CONTENT_X + 920, CONTENT_Y + 120, 300),
          makeCardLabel("audio-np-artist", "Neon Atlas", CONTENT_X + 920, CONTENT_Y + 152, 200),
          makeMediaControls("audio-np-ctrl", CONTENT_X + 920, CONTENT_Y + 220),
          makeDimmer("audio-np-vol", CONTENT_X + 920, CONTENT_Y + 300, 460, 8),
        ],
      }),
    ] as CrestronElement[],
  };

  // --- Security page ---
  const securityPage = {
    id: "security",
    name: "Security",
    width,
    height,
    backgroundColor: "#0a0e1a",
    elements: [
      ...cloneHeaderSidebar("sec"),
      {
        id: "sec-title",
        type: "text" as const,
        name: "Security Title",
        text: "Security",
        x: CONTENT_X + 24, y: CONTENT_Y + 16, width: 200, height: 32,
        style: { textColor: "#ffffff", fontSize: 20, fontFamily: "Inter, sans-serif", background: "transparent" },
      },
      // Security panel
      {
        id: "sec-panel",
        type: "security-panel" as const,
        name: "Security Panel",
        x: CONTENT_X + 24, y: CONTENT_Y + 64,
        width: 380, height: 520,
        style: {},
      },
      // Camera grid
      ...makeGlassCard("sec-cam1", "Front Gate", CONTENT_X + 440, CONTENT_Y + 64, 400, 280, {
        children: [
          makeCardLabel("sec-cam1-lbl", "Front Gate Camera", CONTENT_X + 460, CONTENT_Y + 84, 200),
          { id: "sec-cam1-img", type: "image" as const, name: "Front Gate", x: CONTENT_X + 460, y: CONTENT_Y + 116, width: 360, height: 200, style: { borderRadius: 8, background: "rgba(255,255,255,0.05)" } } as CrestronElement,
        ],
      }),
      ...makeGlassCard("sec-cam2", "Back Yard", CONTENT_X + 860, CONTENT_Y + 64, 400, 280, {
        children: [
          makeCardLabel("sec-cam2-lbl", "Back Yard Camera", CONTENT_X + 880, CONTENT_Y + 84, 200),
          { id: "sec-cam2-img", type: "image" as const, name: "Back Yard", x: CONTENT_X + 880, y: CONTENT_Y + 116, width: 360, height: 200, style: { borderRadius: 8, background: "rgba(255,255,255,0.05)" } } as CrestronElement,
        ],
      }),
      // Zone status
      ...makeGlassCard("sec-zones", "Zones", CONTENT_X + 440, CONTENT_Y + 364, 820, 300, {
        children: [
          makeCardLabel("sec-zones-hdr", "Security Zones", CONTENT_X + 460, CONTENT_Y + 384, 200),
          makeStatusDot("sec-z-front", "Front Door", true, CONTENT_X + 460, CONTENT_Y + 420),
          makeStatusDot("sec-z-back", "Back Door", true, CONTENT_X + 460, CONTENT_Y + 448),
          makeStatusDot("sec-z-garage", "Garage", false, CONTENT_X + 460, CONTENT_Y + 476),
          makeStatusDot("sec-z-patio", "Patio", true, CONTENT_X + 460, CONTENT_Y + 504),
          makeStatusDot("sec-z-pool", "Pool Area", true, CONTENT_X + 700, CONTENT_Y + 420),
          makeStatusDot("sec-z-master", "Master Wing", true, CONTENT_X + 700, CONTENT_Y + 448),
          makeStatusDot("sec-z-basement", "Basement", true, CONTENT_X + 700, CONTENT_Y + 476),
        ],
      }),
    ] as CrestronElement[],
  };

  // --- Living Room page ---
  const livingRoomPage = {
    id: "living-room",
    name: "Living Room",
    width,
    height,
    backgroundColor: "#0a0e1a",
    elements: [
      ...cloneHeaderSidebar("lr"),
      {
        id: "lr-title",
        type: "text" as const,
        name: "Room Title",
        text: "Living Room",
        x: CONTENT_X + 24, y: CONTENT_Y + 16, width: 200, height: 32,
        style: { textColor: "#ffffff", fontSize: 20, fontFamily: "Inter, sans-serif", background: "transparent" },
      },
      // Lighting control
      {
        id: "lr-dimmer",
        type: "dimmer" as const,
        name: "Main Lights",
        x: CONTENT_X + 24, y: CONTENT_Y + 64,
        width: 280, height: 400,
        style: {},
        joins: {
          power: { type: "digital" as const, number: 1, description: "Living room lights on/off" },
          level: { type: "analog" as const, number: 1, description: "Living room light level" },
        },
      },
      // Thermostat
      {
        id: "lr-thermo",
        type: "thermostat" as const,
        name: "Thermostat",
        x: CONTENT_X + 324, y: CONTENT_Y + 64,
        width: 400, height: 520,
        style: {},
        joins: {
          temperature: { type: "analog" as const, number: 10, description: "Current temp" },
          setpoint: { type: "analog" as const, number: 11, description: "Target temp" },
        },
      },
      // Volume
      {
        id: "lr-volume",
        type: "volume-control" as const,
        name: "Volume",
        x: CONTENT_X + 744, y: CONTENT_Y + 64,
        width: 300, height: 400,
        style: {},
        joins: {
          level: { type: "analog" as const, number: 20, description: "Volume level" },
          mute: { type: "digital" as const, number: 20, description: "Mute toggle" },
        },
      },
      // Media
      {
        id: "lr-media",
        type: "media-player" as const,
        name: "Media Player",
        x: CONTENT_X + 1064, y: CONTENT_Y + 64,
        width: 400, height: 480,
        style: {},
      },
      // Shades
      ...makeGlassCard("lr-shades", "Shades", CONTENT_X + 24, CONTENT_Y + 484, 280, 200, {
        children: [
          makeCardLabel("lr-shades-lbl", "Window Shades", CONTENT_X + 44, CONTENT_Y + 504, 200),
          makeDimmer("lr-shades-lvl", CONTENT_X + 44, CONTENT_Y + 544, 240, 8),
          makeCardLabel("lr-shades-pct", "60% Open", CONTENT_X + 44, CONTENT_Y + 570, 100),
        ],
      }),
    ] as CrestronElement[],
  };

  return {
    name: `Crestron Home (${device})`,
    pages: [homePage, audioPage, securityPage, livingRoomPage],
    templates: [],
    libraries: [],
  };

  // ── Helper functions ──

  function makeSidebarButton(id: string, label: string, icon: string, index: number, active: boolean): CrestronElement[] {
    return [{
      id,
      type: "button",
      name: label,
      text: label,
      icon,
      x: 8, y: HEADER_H + 16 + index * 40, width: SIDEBAR_W - 16, height: 36,
      style: {
        background: active ? "rgba(255,255,255,0.10)" : "transparent",
        textColor: active ? "#ffffff" : "rgba(255,255,255,0.4)",
        borderRadius: 12,
        fontSize: 12,
        fontFamily: "Inter, sans-serif",
      },
    }];
  }

  function makeSidebarRoom(id: string, label: string, icon: string, index: number): CrestronElement[] {
    return [{
      id,
      type: "button",
      name: label,
      text: label,
      icon,
      x: 8, y: HEADER_H + 364 + index * 36, width: SIDEBAR_W - 16, height: 32,
      style: {
        background: "transparent",
        textColor: "rgba(255,255,255,0.3)",
        borderRadius: 12,
        fontSize: 12,
        fontFamily: "Inter, sans-serif",
      },
    }];
  }

  function makeGlassCard(id: string, name: string, x: number, y: number, w: number, h: number, opts: { children: CrestronElement[] }): CrestronElement[] {
    return [
      {
        id,
        type: "button",
        name,
        x, y, width: w, height: h,
        style: {
          background: "rgba(255,255,255,0.06)",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
        },
      },
      ...opts.children,
    ];
  }

  function makeCardLabel(id: string, text: string, x: number, y: number, w: number): CrestronElement {
    return {
      id, type: "text", name: text, text,
      x, y, width: w, height: 22,
      style: { textColor: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter, sans-serif", background: "transparent" },
    };
  }

  function makeCardValue(id: string, text: string, x: number, y: number, w: number): CrestronElement {
    return {
      id, type: "text", name: text, text,
      x, y, width: w, height: 28,
      style: { textColor: "#ffffff", fontSize: 22, fontFamily: "Inter, sans-serif", background: "transparent" },
    };
  }

  function makeDimmer(id: string, x: number, y: number, w: number, h: number): CrestronElement {
    return {
      id, type: "slider", name: "Dimmer",
      x, y, width: w, height: h + 20,
      orientation: "horizontal" as any,
      value: 78, min: 0, max: 100,
      style: { textColor: "#f59e0b", background: "rgba(255,255,255,0.08)", borderRadius: 4 },
    } as CrestronElement;
  }

  function makeToggle(id: string, on: boolean, x: number, y: number): CrestronElement {
    return {
      id, type: "button", name: on ? "On" : "Off",
      text: on ? "ON" : "OFF",
      x, y, width: 56, height: 28,
      style: {
        background: on ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.08)",
        textColor: on ? "#34d399" : "rgba(255,255,255,0.4)",
        borderRadius: 14, fontSize: 10, fontFamily: "Inter, sans-serif",
      },
    };
  }

  function makeThermostatMini(id: string, x: number, y: number): CrestronElement {
    return {
      id, type: "mini-thermostat", name: "Mini Thermostat",
      x, y, width: 140, height: 140,
      style: {},
    };
  }

  function makeMediaControls(id: string, x: number, y: number): CrestronElement {
    return {
      id, type: "media-player", name: "Media Controls",
      x, y, width: 300, height: 120,
      style: {},
    };
  }

  function makeSceneButton(id: string, label: string, x: number, y: number, color: string): CrestronElement {
    return {
      id, type: "button", name: label, text: label,
      x, y, width: 150, height: 56,
      style: {
        background: `${color}26`,
        textColor: color,
        borderRadius: 12, fontSize: 13, fontFamily: "Inter, sans-serif",
        borderWidth: 1, borderColor: `${color}33`,
      },
    };
  }

  function makeStatusDot(id: string, label: string, ok: boolean, x: number, y: number): CrestronElement {
    return {
      id, type: "button", name: label,
      text: `● ${label}`,
      x, y, width: 200, height: 24,
      style: {
        background: "transparent",
        textColor: ok ? "#34d399" : "#f87171",
        fontSize: 12, fontFamily: "Inter, sans-serif",
        borderRadius: 0,
      },
    };
  }

  function makeGaugeBar(id: string, x: number, y: number, w: number, h: number, pct: number): CrestronElement {
    return {
      id, type: "slider", name: "Gauge",
      x, y, width: w, height: h + 16,
      orientation: "horizontal" as any,
      value: Math.round(pct * 100), min: 0, max: 100,
      style: { textColor: "#3b82f6", background: "rgba(255,255,255,0.08)", borderRadius: 4 },
    } as CrestronElement;
  }

  function makeAudioZone(id: string, label: string, zoneNum: number, x: number, y: number): CrestronElement[] {
    return [
      ...makeGlassCard(id, label, x, y, 840, 100, {
        children: [
          makeCardLabel(`${id}-name`, label, x + 20, y + 16, 200),
          makeToggle(`${id}-toggle`, true, x + 740, y + 16),
          makeDimmer(`${id}-vol`, x + 20, y + 52, 660, 8),
          {
            id: `${id}-src`,
            type: "button" as const,
            name: `Source ${zoneNum}`,
            text: "Spotify",
            x: x + 700, y: y + 52,
            width: 120, height: 28,
            style: {
              background: "rgba(255,255,255,0.06)",
              textColor: "rgba(255,255,255,0.6)",
              borderRadius: 8, fontSize: 11, fontFamily: "Inter, sans-serif",
            },
          },
        ],
      }),
    ];
  }

  function cloneHeaderSidebar(prefix: string): CrestronElement[] {
    return [
      {
        id: `${prefix}-hdr-bg`,
        type: "button",
        name: "Header Background",
        x: 0, y: 0, width, height: HEADER_H,
        style: { background: "rgba(255,255,255,0.04)", borderRadius: 0, borderWidth: 0 },
      },
      {
        id: `${prefix}-hdr-title`,
        type: "text",
        name: "Header Title",
        text: "Crestron Home",
        x: 52, y: 14, width: 140, height: 28,
        style: { textColor: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "Inter, sans-serif", background: "transparent" },
      },
      {
        id: `${prefix}-sidebar-bg`,
        type: "button",
        name: "Sidebar Background",
        x: 0, y: HEADER_H, width: SIDEBAR_W, height: CONTENT_H,
        style: { background: "rgba(255,255,255,0.02)", borderRadius: 0, borderWidth: 0 },
      },
      ...makeSidebarButton(`${prefix}-sb-overview`, "Overview", "LayoutGrid", 0, false),
      ...makeSidebarButton(`${prefix}-sb-audio`, "Audio", "Music", 2, prefix === "audio"),
      ...makeSidebarButton(`${prefix}-sb-video`, "Video", "Tv", 3, false),
      ...makeSidebarButton(`${prefix}-sb-security`, "Security", "Shield", 4, prefix === "sec"),
      ...makeSidebarButton(`${prefix}-sb-settings`, "Settings", "Wrench", 7, false),
      {
        id: `${prefix}-sb-rooms-label`,
        type: "text",
        name: "Rooms Label",
        text: "ROOMS",
        x: 20, y: HEADER_H + 340, width: 160, height: 18,
        style: { textColor: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "Inter, sans-serif", background: "transparent" },
      },
      ...makeSidebarRoom(`${prefix}-sb-living`, "Living Room", "Home", 0),
      ...makeSidebarRoom(`${prefix}-sb-kitchen`, "Kitchen", "UtensilsCrossed", 1),
      ...makeSidebarRoom(`${prefix}-sb-bedroom`, "Master Bedroom", "Bed", 2),
    ];
  }
}
