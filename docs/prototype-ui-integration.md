# Prototype UI Integration (AVF/CH5 + React)

This guide explains how to properly handle code from the AVF6.9 CH5 source package in VS Code and integrate prototypes into this repository.

## What You Have (Attached Package)
- A CH5 shell template with webpack-based build and `project-config.json` page metadata.
- Utility scripts for import/export/generate operations under `shell-utilities/`.
- HTML component/page architecture (`app/project/components/pages/...`) rather than React-first.

## What This Repo Uses
- API: .NET 8 (`api/JoinListApi`) on `http://localhost:5000`.
- UI: React + TypeScript + Vite (`ui/`) on `http://localhost:5173`.
- Router entry: `ui/src/App.tsx`.
- Sidebar links: `ui/src/components/NavSidebar.tsx`.

## Recommended Workflow in VS Code
1. Keep AVF package as external source-of-truth for visual assets and page intent.
2. Build production UI in this repo (`ui/`) using React pages and typed API clients.
3. Use a contract-first mapping file for controls to joins/actions.
4. Never bind UI directly to random join numbers in JSX; map through JSON contract.

## New Tooling Added in UI
- Route: `/#/prototype-studio`
- Page file: `ui/src/pages/PrototypeStudioPage.tsx`
- Drag, move, and resize widgets in-browser.
- Assign per-widget join metadata:
  - `joinType`: `digital|analog|serial`
  - `join` number
  - `direction`: `input|output`
- Export/import layout JSON for handoff and iteration.

## How To Use Prototype Studio
1. Open `http://localhost:5173/#/prototype-studio`.
2. Add widgets from palette.
3. Drag by widget header and resize from corner.
4. Assign join metadata in property panel.
5. Export JSON and commit it to repo (for example under `assets/projects/` or `ui/src/prototypes/`).

## Integrating Your Prototype Interface When Ready
1. Copy prototype assets (icons/backgrounds) into `ui/public/prototype-kit/`.
2. Load background in Prototype Studio to align layout.
3. Recreate interactive elements as widgets and map joins/actions.
4. Export JSON and create a dedicated React runtime page that renders this JSON.
5. Connect actions to API endpoints (Sonos/AppleTV/etc.).

## CH5 vs React Clarification
- CH5 shell is ideal for panel/webxpanel specific projects.
- This repo UI is React/Vite and should remain React-native for maintainability.
- If you need native Crestron CH5 packaging, treat it as a separate build target and share only assets + contracts.

## Next Step Recommendation
- Implement a `PrototypeRuntimePage` that reads exported layout JSON and renders production controls with API bindings.
- Keep `PrototypeStudioPage` as the authoring environment.
