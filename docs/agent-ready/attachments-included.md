# Attached Assets Included

This repository now includes an attachment analysis pipeline for the supplied external materials.

## Sources indexed
- `ch5_2.17.1_release_notes.pdf`
- `ss_SDK-CD.pdf`
- `crestron_drivers_sdk_27.0000.0024/`

## Backend endpoint
- `GET /api/attachments/analyze`

The endpoint returns:
- SDK folder presence and top-level sections
- ZIP artifacts under SDK tree
- XML library list with member-count estimates
- PDF presence/size/modified metadata for CH5 and SDK-CD PDFs

## Frontend visibility
Use `Agent Guide -> Analyze Attachments` to run and display the analysis.

## Notes
- This integration keeps source files in-place and indexes them for workflows.
- Raw PDF transformations are intentionally not auto-generated here.
