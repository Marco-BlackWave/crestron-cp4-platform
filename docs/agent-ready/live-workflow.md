# Always-Live Workflow (Fixed Ports)

## Goal
Keep API and UI live after any code change without manual restarts.

## Fixed ports
- API: `5000`
- UI: `5173` (strict)

## Start options

### Option A — VS Code Task (recommended)
Run task: **Live Stack**.

Tasks are defined in `.vscode/tasks.json`:
- `API Watch (5000)` uses `dotnet watch run`
- `UI Dev (5173)` uses Vite on strict port 5173

### Option B — PowerShell launcher
Run:

```powershell
pwsh tools/dev-live.ps1
```

## Why this stays live
- `dotnet watch run` auto-restarts API on backend file changes.
- Vite HMR updates frontend immediately on UI file changes.
- Strict frontend port avoids port drift and stale bookmarks.
