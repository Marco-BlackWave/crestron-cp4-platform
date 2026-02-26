# Crestron Home Automation Dashboard

Exported: 2026-02-26T11:57:47.244Z

## Quick Start

```bash
npm install
npm run dev
```

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS v4
- Vite
- Motion (animations)
- date-fns (calendar)
- react-dnd (drag & drop)
- lucide-react (icons)

## Project Structure

```
src/
  app/
    App.tsx                  # Main entry — section-based nav
    components/
      OverviewDashboard.tsx  # Drag-to-reorder masonry dashboard
      TechControlPanel.tsx   # Tesla-style infrastructure panel
      LightGroupLab.tsx      # Philips Hue drag-to-merge lab
      RoomDetailSection.tsx  # Per-room detail with RGB wheel
      ClimateCard.tsx        # Thermostat card
      CardExporter.tsx       # Per-card Crestron HTML export
      ProjectExporter.tsx    # Whole-project export system
      ...
    components/ui/           # Shared UI primitives
  styles/
    index.css               # Root stylesheet
    tailwind.css            # Tailwind v4 config
    theme.css               # Design tokens
    fonts.css               # Inter font import
```

## Crestron Integration

Components include `data-join-*` attributes for CrComLib binding.
Use the Export button in the header to generate standalone HTML
with inlined styles for direct Crestron panel deployment.
