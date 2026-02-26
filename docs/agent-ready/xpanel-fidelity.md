# XPanel Fidelity Workflow

## Objective
Preserve attached external XPanel source and validate join fidelity before hardware deployment.

## Operator Flow
1. Open `/#/xpanel-fidelity`.
2. Run **Analyze Source**.
3. Confirm:
   - source root exists
   - key files found (`package.json`, `src/app`, `src/index.css`)
   - `data-join-*` counts are non-zero where expected
   - JoinContract is available from current `SystemConfig`
4. Run **Prepare Package**.
   - keep build off for fast staging checks
   - enable build for full package confidence (`runBuild=true`)
5. Verify generated files:
   - `assets/xpanel-package/join-bridge/JoinBridge.generated.json`
   - `assets/xpanel-package/join-bridge/JoinList.generated.json`

## API Endpoints
- `GET /api/xpanel/analyze`
- `POST /api/xpanel/prepare-package`

## Join Test Harness
Use `src/ProcessorSide/Bindings/XPanelJoinHarness.cs` to push synthetic joins in software:
- `PushDigital(join, value)`
- `PushAnalog(join, value)`
- `PushSerial(join, value)`
- `Snapshot()` / `SnapshotMap()` for observed signal state

This allows pre-hardware validation of signal routing via `SignalRegistry` and `SystemEngine`.
