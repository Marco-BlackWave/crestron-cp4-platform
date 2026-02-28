# Template Projects and Per-Project Repositories

## Template projects
Use Configure -> Scaffold and select a template to generate baseline config quickly.

Templates are defined in:
- `ui/src/data/projectTemplates.ts`

## Integration packs (frontend)
Use Configure -> Studio integration pack buttons:
- BACnet
- KNX
- Lutron QSX
- Lutron QS Telnet

These assign integration-ready device references directly into room config.

## Per-project git repository bootstrap
From Configure page, click **Repo** for a saved project.

Backend endpoint:
- `POST /api/projects/{id}/bootstrap-repo`

Generated path:
- `assets/project-repos/<project-id>/`

Generated files:
- `SystemConfig.json`
- `JoinContract.json`
- `JoinList.json`
- `README.md`
- `.gitignore`

`git init` is executed automatically when available.
