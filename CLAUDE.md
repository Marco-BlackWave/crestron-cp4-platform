# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Crestron CP4 processor control system with three layers: a C# processor-side library (SIMPL# Pro), a C# HTTP API, and a React/TypeScript UI. All three share a common JSON-based "Join List" configuration schema.

## Build & Run Commands

### C# Projects (Visual Studio Solution: `crestron 4 Backend.sln`)
- **Processor side** (`src/ProcessorSide/`): .NET Framework 4.7.2 Crestron SIMPL# Pro library. Requires Crestron SDK. Build via Visual Studio or `dotnet build` with Crestron SDK installed.
- **API** (`api/JoinListApi/`): .NET 8.0 minimal API.
  - Run: `dotnet run --project api/JoinListApi`
  - Serves on `http://localhost:5000`

### React UI (`ui/`)
- Install: `cd ui && npm install`
- Dev server: `npm run dev` (port 5173, proxies `/api` to localhost:5000)
- Build: `npm run build`
- Test: `npm test` (vitest)

### Full dev workflow
Run the API (`dotnet run --project api/JoinListApi`) and UI dev server (`cd ui && npm run dev`) simultaneously. The Vite proxy forwards `/api` requests to the .NET API.

## Architecture

### Three-Layer System

1. **Processor Side** (`src/ProcessorSide/`) — C# library deployed to CP4 hardware
   - `Configuration/` — Loads, validates, and provides paths for `JoinList.json` (DataContract serialization). `JoinListValidator` validates all fields including `projectId`, join numbers, names, directions, and duplicate detection.
   - `Core/` — Join-agnostic signal management (`Signal`, `SignalRegistry`, `CoreEngine`). Thread-safe with lock-based synchronization. Has no Crestron dependencies and is independently testable.
   - `Bindings/` — Adapts joins to core signals. Strategy pattern: `DigitalJoinBinding`, `AnalogJoinBinding`, `SerialJoinBinding` all implement `IJoinBinding` via `JoinBindingBase`. `TriListJoinEndpoint` wraps Crestron `BasicTriList`. Per-binding error isolation ensures one bad join doesn't prevent others from binding.
   - `Infrastructure/` — Abstractions for file system (`IFileSystem`), logging (`ILogger` with timestamps), and thread-safe safe-mode state.
   - `Program.cs` — Entry point: load config → validate → register EISC → init CoreEngine → bind joins → start. Falls into safe mode on failure. Handles EISC online/offline events and program shutdown cleanup.
   - **Direction semantics**: `"input"` = device/panel sends TO the program (uses Crestron `BooleanOutput`/`UShortOutput`/`StringOutput`). `"output"` = program sends TO the device/panel (uses Crestron `BooleanInput`/`UShortInput`/`StringInput`).
   - **Signal keys**: Signals use composite keys (`{joinType}:{name}`) to prevent cross-type name collisions.

2. **HTTP API** (`api/JoinListApi/Program.cs`) — Single-file ASP.NET Core minimal API
   - `GET /api/health` — Health check (no auth required)
   - `GET /api/joinlist` — Read join list (requires `X-API-Key` header)
   - `PUT /api/joinlist` — Write join list with full server-side validation (requires `X-API-Key` header)
   - Server-side validation includes: schema version, processor, projectId, join entry structure (positive integers, non-empty names, valid directions), and duplicate join detection per type.
   - Timing-safe API key comparison, CORS configured for dev UI origin, 1MB request size limit, file locking via SemaphoreSlim, atomic writes, global exception handler.
   - API key configured via environment variables or `appsettings.json` (empty default requires explicit configuration). `appsettings.Development.json` only loads in Development environment.

3. **UI** (`ui/`) — React 19 + TypeScript + Vite dashboard
   - `src/App.tsx` — Main component: password-masked API key input, join list loading, stats display, semantic HTML table, JSON editor with auto-refresh after save.
   - `src/schema/joinListSchema.ts` — Zod schema mirroring backend validation with string-to-number coercion for join values, direction normalization, processor normalization, and duplicate join detection via `superRefine`.
   - `src/api/` — `loadJoinList.ts` and `saveJoinList.ts` with Zod validation on both read and write. JSON error response parsing for user-friendly messages.

### Join List JSON Schema

Config file lives at `\User\JoinList.json` on the processor (and `assets/JoinList.json` for local dev). Structure:
- `schemaVersion`: must be `"1.0"`
- `processor`: must be `"CP4"`
- `projectId`: required non-empty string
- `debugMode`: optional boolean
- `joins.digital/analog/serial`: arrays of `{ join: number>0, name: string, direction: "input"|"output" }`
- No duplicate join numbers within a type (enforced by all three layers)

### Key Patterns
- Constructor-based dependency injection throughout processor side
- Strategy pattern for join type bindings
- Observer pattern for signal change notifications
- Thread-safe signal management with lock-based synchronization
- Per-binding error isolation in JoinBinder
- Zod preprocessing in UI to coerce strings to numbers for join values and normalize direction/processor case

## Mandatory Crestron Coding Rules

1. **Constructor**: Only set thread priorities. NO hardware access in constructor.
2. **InitializeSystem()**: All hardware registration goes here. Register EISC before accessing it.
3. **File I/O**: Use `Crestron.SimplSharp.CrestronIO` — NEVER `System.IO`.
4. **Logging**: Use `CrestronConsole.PrintLine()` and `ErrorLog` — NEVER `Console.WriteLine`.
5. **Threading**: Use `lock` or `Interlocked` for safety. Never block `InitializeSystem`.
6. **Direction**: `"input"` = device→program (Crestron `*Output`), `"output"` = program→device (Crestron `*Input`).
7. **Error isolation**: One bad join/device must not crash others. Always per-item try/catch.
8. **No hardcoding**: All join numbers, device IDs, addresses from config files.
9. **DI**: Constructor-based dependency injection. No service locator, no static mutable state.
10. **Shutdown**: Subscribe to `CrestronEnvironment.ProgramStatusEventHandler`, clean up all resources.

## Platform Architecture

### Six-Layer System
The processor side extends to a 6-layer platform for residential/yacht projects:
1. **Transport** (`Transport/`) — Protocol abstraction: IR, Serial, TCP, UDP
2. **Device Drivers** (`Devices/`) — Interface-based drivers reading commands from JSON device profiles
3. **Subsystems** (`Subsystems/`) — AV, Lighting, Shades, HVAC per room
4. **Room** (`Core/RoomController.cs`) — Owns subsystems, routes signals by join offset
5. **System** (`Core/SystemEngine.cs`) — Owns rooms + DeviceManager, scenes, scheduling
6. **API/UI** — REST API + React dashboard (existing)

### Configuration Files
- `JoinList.json` — Legacy simple config (still supported)
- `SystemConfig.json` — Full platform config with rooms, devices, sources, scenes
- `devices/*.json` — Device profile database (commands per protocol)

### Join Map Convention
- 100 joins per room per type (digital/analog/serial)
- Room offset: 0, 100, 200, ... (configurable in SystemConfig)
- System-wide joins: 900+ (All Off, scenes)
- `JoinContractExporter` generates `JoinContract.json` for graphics project
