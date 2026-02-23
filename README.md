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

## Notes
- If the Join List is invalid or missing, the program enters safe mode and logs errors.
- The core layer has no Crestron dependencies and can be tested separately.

