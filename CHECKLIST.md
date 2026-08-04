# Lantern implementation checklist

## Product and repository

- [x] Define Lantern as a simpler, visual NetBox alternative for homelabs.
- [x] Define local-first and optional vendor-hosted deployment models.
- [x] Define open-source core versus paid convenience features.
- [x] Create Lantern as a standalone Git repository.
- [x] Preserve the full product context in [PLAN.md](PLAN.md).

## Deployment foundation

- [x] Add Dockerfile.
- [x] Add Docker Compose deployment with persistent data volume.
- [x] Add local Node.js start command.
- [x] Add local JSON persistence for the prototype.
- [ ] Replace prototype JSON persistence with PostgreSQL.
- [ ] Add a separate background worker for long-running scans and scheduled jobs.

## MVP user experience

- [x] Add responsive dashboard.
- [x] Add IPAM network table and address-capacity indicators.
- [x] Add 2D rack elevation view.
- [x] Add discovery review view.
- [x] Remove external font dependency so the app works offline.
- [ ] Add onboarding/setup flow.
- [ ] Add real forms for creating sites and racks.
- [x] Add initial network and device creation controls.
- [ ] Add search and filtering.
- [ ] Add standalone-device homelab map view.

## IPAM and inventory

- [x] Add IPv4 CIDR calculations and usable-address helpers.
- [x] Add seeded site, rack, and management network.
- [x] Add device creation API.
- [x] Add network creation API.
- [x] Add manual IP assignment validation.
- [x] Add rack-unit collision validation.
- [ ] Add device editing and deletion with safe history.
- [ ] Add import/export.
- [ ] Add local backup and restore UI.
- [ ] Add planned IPv6 support.

## Discovery

- [x] Make scans explicitly opt-in.
- [x] Add explicit subnet selection in the UI.
- [x] Add bounded common-port TCP discovery.
- [x] Add a 1,024-address scan safety limit.
- [x] Keep discoveries pending until confirmation.
- [x] Remove fabricated discovery candidates.
- [ ] Add scan progress and partial-failure reporting.
- [ ] Add ignore, dismiss, and merge actions.
- [ ] Add scheduled scans.
- [ ] Add service-aware discovery.
- [ ] Add optional agent-based inventory.

## Quality and operations

- [x] Add IPAM unit tests.
- [x] Add inventory validation tests.
- [x] Add JavaScript syntax checks.
- [ ] Add API integration tests.
- [ ] Add browser smoke tests.
- [ ] Validate Docker image build on a machine with Docker installed.
- [ ] Add health endpoint and container healthcheck.
- [ ] Add authentication before exposing beyond a trusted LAN.

## Paid roadmap

- [ ] Define Lantern Cloud protocol.
- [ ] Add encrypted off-site backups.
- [ ] Add secure remote access.
- [ ] Add notifications and cross-installation sync.
- [ ] Add managed update/support channels.
- [ ] Add self-hostable cloud companion.
- [ ] Validate premium integrations and collaboration features with users.

## Current work

- [x] Finish and verify editable network/device/rack/IP workflows.
- [x] Commit the editable-inventory slice.
