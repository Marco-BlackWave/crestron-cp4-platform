import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { SystemConfig } from "../schema/systemConfigSchema";

interface GuideStep {
  title: string;
  description: string;
  link: string;
  linkLabel: string;
  checkStatus: (ctx: StepContext) => "done" | "ready" | "locked";
}

interface StepContext {
  hasProject: boolean;
  hasRooms: boolean;
  hasSources: boolean;
}

const guideSteps: GuideStep[] = [
  {
    title: "Scan Network",
    description: "Discover Crestron processors and devices on your local network.",
    link: "/network",
    linkLabel: "Open Scanner",
    checkStatus: () => "ready",
  },
  {
    title: "Create Project",
    description: "Name your project, define processors, and set up the basic structure.",
    link: "/configure/wizard",
    linkLabel: "New Project",
    checkStatus: () => "ready",
  },
  {
    title: "Configure Rooms",
    description: "Add rooms, assign subsystems, and configure devices for each space.",
    link: "/configure/rooms",
    linkLabel: "Edit Rooms",
    checkStatus: (ctx) => ctx.hasProject ? (ctx.hasRooms ? "done" : "ready") : "locked",
  },
  {
    title: "Add Sources",
    description: "Define AV sources like Apple TV, cable boxes, and streaming devices.",
    link: "/configure/sources",
    linkLabel: "Manage Sources",
    checkStatus: (ctx) => ctx.hasProject ? (ctx.hasSources ? "done" : "ready") : "locked",
  },
  {
    title: "Test Panel",
    description: "Simulate your touch panel interface to verify join signals and UI flow.",
    link: "/panel",
    linkLabel: "Open Panel",
    checkStatus: (ctx) => ctx.hasProject ? "ready" : "locked",
  },
  {
    title: "Deploy",
    description: "Validate your configuration, generate join files, and export for the processor.",
    link: "/configure/export",
    linkLabel: "Export & Deploy",
    checkStatus: (ctx) => ctx.hasProject && ctx.hasRooms ? "ready" : "locked",
  },
];

const concepts = [
  {
    title: "Joins",
    description:
      "Numbered signal connections between the processor and the touch panel. Three types: digital (on/off), analog (0\u201365535), and serial (text strings). Each room gets 100 joins; system-wide joins start at 900+.",
  },
  {
    title: "Subsystems",
    description:
      "Room capabilities that define what a room can do: AV (audio/video), Lighting, Shades, HVAC, and Security. Each subsystem adds specific device roles and join signals to the room.",
  },
  {
    title: "Device Profiles",
    description:
      "Pre-built command sets for hardware devices, stored in the device database. Each profile defines supported protocols (IR, Serial, IP, BACnet, etc.) and the commands available over each protocol.",
  },
  {
    title: "Sources",
    description:
      "Media inputs like Apple TV, Cable Box, or Blu-ray players that are assigned to rooms. Sources are defined globally and then enabled per room so multiple rooms can share the same source list.",
  },
  {
    title: "Scenes",
    description:
      "Multi-room presets that trigger a combination of actions across rooms. Examples: \"Movie Night\" dims lights and powers on the display, \"Good Night\" turns everything off system-wide.",
  },
  {
    title: "EISC",
    description:
      "Ethernet IntersystemCommunications \u2014 the bridge between the CP4 processor and the UI/touch panel. Configured with an IP-ID and IP address, it carries all join signals between the two systems.",
  },
];

export default function GettingStartedPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    document.title = "Getting Started \u2014 CP4";
  }, []);

  // Fetch current config status from API (lightweight check)
  useEffect(() => {
    fetch("/api/systemconfig", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setConfig(data); })
      .catch(() => { /* no config available */ });
  }, []);

  const ctx: StepContext = {
    hasProject: !!config,
    hasRooms: (config?.rooms?.length ?? 0) > 0,
    hasSources: (config?.sources?.length ?? 0) > 0,
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Getting Started</h1>
          <p className="subhead">
            Follow these steps to configure and deploy your Crestron CP4 system.
          </p>
        </div>
      </div>

      {/* Interactive guided steps */}
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Setup Guide</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 700, marginBottom: 32 }}>
        {guideSteps.map((step, i) => {
          const status = step.checkStatus(ctx);
          return (
            <div
              key={step.title}
              className={`card ${status === "locked" ? "card--locked" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: status === "locked" ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                  background: status === "done" ? "#22c55e" : status === "ready" ? "rgba(59,130,246,0.15)" : "rgba(100,116,139,0.1)",
                  color: status === "done" ? "#fff" : status === "ready" ? "#2563eb" : "#64748b",
                }}
              >
                {status === "done" ? "\u2713" : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{step.title}</h3>
                <p className="subhead" style={{ margin: "2px 0 0", fontSize: 13 }}>{step.description}</p>
              </div>
              {status !== "locked" && (
                <Link
                  to={step.link}
                  className={`button ${status === "done" ? "" : "primary"}`}
                  style={{ textDecoration: "none", flexShrink: 0, fontSize: 13 }}
                >
                  {step.linkLabel}
                </Link>
              )}
              {status === "locked" && (
                <span style={{ fontSize: 12, color: "var(--text-faint)", flexShrink: 0 }}>
                  Complete previous steps
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Key concepts */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Key Concepts</h2>
      <div className="gs-concepts">
        {concepts.map((concept) => (
          <div key={concept.title} className="gs-concept">
            <h3>{concept.title}</h3>
            <p>{concept.description}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <Link to="/configure" className="button primary" style={{ textDecoration: "none", padding: "12px 32px", fontSize: 16 }}>
          Start Configuring
        </Link>
      </div>
    </div>
  );
}
