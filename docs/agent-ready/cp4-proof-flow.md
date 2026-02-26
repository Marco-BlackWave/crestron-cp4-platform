# CP4 Proof Flow (Frontend -> Hardware)

## Objective
Demonstrate real transfer and verification from frontend-driven configuration to CP4 `/User` files.

## Steps
1. Configure project from Scaffold/Studio and save.
2. Deploy page:
   - Test Auth
   - Preview
   - Execute
   - Verify
3. Confirm all files are present and size-match:
   - `/User/SystemConfig.json`
   - `/User/JoinList.json`
   - `/User/JoinContract.json`

## Integration readiness report
Use endpoint:
- `GET /api/integrations/proof`

This reports:
- transfer readiness
- join count
- integration evidence for BACnet/KNX/Lutron variants
- feedback-ready flags based on config + join contract

## Runtime feedback note
Final runtime protocol/device feedback behavior still requires connected field devices and active program logic on CP4.
