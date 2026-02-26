# Crestron CP4 Processor Side

This project provides a layered, join-list-driven processor-side architecture for Crestron Series 4 (CP4) physical processors.

## Summary
- Configuration layer loads and validates a Join List JSON.
- Core layer is join-agnostic and testable outside Crestron.
- Join Binding layer adapts joins to core signals.
- Runtime entry performs safe startup and logging.

## Setup
1. Place a Join List JSON on the processor at \User\JoinList.json.
2. Configure the join endpoint inside the runtime entry (see Program.cs) to point at your actual join source (for example, a panel, EISC, or other tri-list source).
3. Build and deploy using your standard Crestron SIMPL# Pro workflow.

## Sample Join List
See assets/JoinList.json for a minimal example that matches the expected schema and join directions.

## Join List API
The API project provides a real HTTP endpoint for the UI to read/write the Join List JSON.

- Project: api/JoinListApi
- Default base URL: http://localhost:5000/api
- Required header: X-API-Key (set in api/JoinListApi/appsettings.json)

Endpoints:
- GET /api/joinlist
- PUT /api/joinlist

The UI proxies /api to http://localhost:5000 during development (see ui/vite.config.ts).

## Workflow-First UI (New)
The UI now follows a Crestron-style programming flow:

- Project: one-look cockpit (`/project`)
- Configure: project/rooms/sources/scenes/deploy (`/configure`)
- Code: SIMPL+ workspace (`/code`)
- Validate: runtime debug/signal verification (`/validate`)
- Deploy: transfer and verify (`/configure/deploy`)

Legacy routes (`/logic`, `/debug`, `/dashboard`) remain available.

## Task-to-Project Scaffolding (New)
A new endpoint allows generating a `SystemConfig` draft from tasks/specs:

- POST `/api/systemconfig/scaffold`

Request shape:

```json
{
	"systemName": "Aurora Residence",
	"projectId": "aurora-residence",
	"tasks": ["Create baseline AV + lighting"],
	"integrations": ["Sonos", "Lutron"],
	"rooms": [
		{ "name": "Living Room", "subsystems": ["av", "lighting"], "roomType": "standard" },
		{ "name": "Equipment Rack", "roomType": "technical" }
	],
	"processors": [
		{ "id": "main", "processor": "CP4", "eiscIpId": "0x03", "eiscIpAddress": "127.0.0.2" }
	]
}
```

Response includes:

- `config`: generated `SystemConfig`
- `report`: task/integration counts and assumptions taken during generation

The UI exposes this flow in Configure → `Scaffold`.

## Notes
- If the Join List is invalid or missing, the program enters safe mode and logs errors.
- The core layer has no Crestron dependencies and can be tested separately.

## Always-Live Development (Fixed Ports)
- API is fixed on `http://localhost:5000`.
- UI dev server is fixed on `http://localhost:5173` (strict port).
- Use VS Code task `Live Stack` (from `.vscode/tasks.json`) for watch-mode API + UI HMR.
- Alternative launcher: `pwsh tools/dev-live.ps1`.

## Agent-Ready Docs
See `docs/agent-ready/`:
- `README.md`
- `live-workflow.md`
- `project-templates-and-repos.md`
- `cp4-proof-flow.md`
- `attachments-included.md`

## XPanel Fidelity Pipeline (New)
Validate external XPanel source fidelity and generate join-bridge artifacts in this repo.

Important scope boundary:
- This pipeline is for XPanel/web deployment fidelity only.
- It does not replace native Crestron iPad/iPhone app packaging, App ID binding, or Smart Graphics/CH5 mobile project workflows.
- Native mobile deliverables must be validated and deployed through the corresponding native panel toolchain.

Backend endpoints:
- `GET /api/xpanel/analyze`
- `POST /api/xpanel/prepare-package`

Default paths:
- Source root: `C:\Users\BlackWave\Desktop\crestron-home`
- Package output: `assets/xpanel-package`

UI route:
- `/#/xpanel-fidelity`

Prepare-package output includes:
- `assets/xpanel-package/source/*` (staged source copy)
- `assets/xpanel-package/join-bridge/JoinBridge.generated.json`
- `assets/xpanel-package/join-bridge/JoinList.generated.json`
- optional `assets/xpanel-package/dist/*` when `runBuild=true`

Processor-side software harness:
- `src/ProcessorSide/Bindings/XPanelJoinHarness.cs`

Harness usage supports software-only validation by pushing synthetic digital/analog/serial joins into `SignalRegistry` and routing through `SystemEngine.ProcessSignalChange(...)` before hardware deployment.

