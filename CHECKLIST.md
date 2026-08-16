# Lantern implementation checklist

## Product and repository

- [x] Define Lantern as a simpler, visual NetBox alternative for homelabs.
- [x] Define local-first and optional vendor-hosted deployment models.
- [x] Define open-source core versus paid convenience features.
- [x] Create Lantern as a standalone Git repository.
- [x] Create and push the public GitHub repository.
- [x] Preserve the full product context in [PLAN.md](PLAN.md).

## Deployment foundation

- [x] Add Dockerfile.
- [x] Add Docker Compose deployment with persistent data volume.
- [x] Add local Node.js start command.
- [x] Add local JSON persistence for the prototype.
- [x] Replace prototype JSON persistence with PostgreSQL.
- [ ] Add a separate background worker for long-running scans and scheduled jobs.

## MVP user experience

- [x] Add responsive dashboard.
- [x] Make the dashboard fluid across the viewport.
- [x] Add IPAM network table and address-capacity indicators.
- [x] Add clickable network address detail with used/available tables.
- [x] Add editable IP descriptions and addresses.
- [x] Add 2D rack elevation view.
- [x] Add router, server, and switch rack imagery.
- [x] Add discovery review view.
- [x] Add service classification and inferred device roles to discovery.
- [x] Show raw discovered ports and merge-on-confirm behavior.
- [x] Remove external font dependency so the app works offline.
- [x] Add onboarding/setup flow.
- [x] Add site and rack creation APIs.
- [x] Add setup modal/forms for sites, racks, networks, and devices.
- [x] Add initial network and device creation controls.
- [x] Add global search and filtering.
- [x] Add standalone-device homelab map view.
- [x] Add visible Sites view with rack/device/network counts.
- [x] Add dedicated Devices inventory view linked to IPAM, racks, and services.
- [x] Expand site cards into rack, network, and device details.
- [x] Add drag-and-drop placement from unplaced devices into rack units.
- [x] Support two half-width devices sharing one rack unit with left/right occupancy.
- [x] Render rack equipment across the rack width with device imagery.
- [x] Add physical, VM, and container device types with hosted-by relationships.
- [x] Keep VM and container records out of physical rack placement.
- [x] Link rack equipment and Devices view to shared device details.
- [x] Show all unplaced devices at the bottom of Racks & map.
- [x] Add UniFi 24-port, 48-port, UDM Pro, and UXG Pro rack profiles.
- [x] Use real manufacturer front elevations for UniFi USW-24/48, UDM Pro, UXG Pro, Synology RS1221+, and APC SRT2200RMXLI profiles.
- [x] Remove the replaced label-over-generic UniFi, Synology, and APC artwork.
- [x] Replace stretched/3D-looking rack art with flat front-facing rack faceplates.
- [x] Add common rack profiles including UniFi-style, Cisco-style, generic equipment, UPS, NAS, and patch panels.
- [x] Keep a single rack constrained to a readable width in Racks & map.

## IPAM and inventory

- [x] Add IPv4 CIDR calculations and usable-address helpers.
- [x] Add seeded site, rack, and management network.
- [x] Add device creation API.
- [x] Add network creation API.
- [x] Add manual IP assignment validation.
- [x] Add rack-unit collision validation.
- [x] Add device editing and deletion with safe history.
- [x] Add safe device deletion with linked IP cleanup.
- [x] Add versioned import/export backup format and APIs.
- [x] Add local backup and restore UI.
- [ ] Add planned IPv6 support.

## Discovery

- [x] Make scans explicitly opt-in.
- [x] Add explicit subnet selection in the UI.
- [x] Add bounded common-port TCP discovery.
- [x] Add a 1,024-address scan safety limit.
- [x] Keep discoveries pending until confirmation.
- [x] Remove fabricated discovery candidates.
- [x] Add ignore and merge lifecycle API actions.
- [x] Add richer scan classification, reverse hostnames, services, and inferred roles.
- [x] Rescan known devices and refresh observed hostname, health, and open-port services without replacing manual metadata.
- [x] Add scan progress and partial-failure reporting.
- [x] Add ignore, dismiss, and merge actions.
- [ ] Add scheduled scans.
- [x] Add service-aware discovery.
- [x] Add per-service overview visibility and dashboard service status.
- [ ] Add optional agent-based inventory.

## Quality and operations

- [x] Add IPAM unit tests.
- [x] Add inventory validation tests.
- [x] Add JavaScript syntax checks.
- [x] Add API integration tests.
- [x] Add browser smoke tests.
- [x] Add topology application cards for services hosted on each device.
- [x] Add drag-between-device/group topology connectors.
- [x] Validate Docker image build on a machine with Docker installed.
- [x] Add health endpoint and container healthcheck.
- [x] Add authentication before exposing beyond a trusted LAN.

## Paid roadmap

- [ ] Define Lantern Cloud protocol.
- [ ] Add encrypted off-site backups.
- [ ] Add secure remote access.
- [ ] Add notifications and cross-installation sync.
- [ ] Add managed update/support channels.
- [ ] Add self-hostable cloud companion.
- [ ] Add configurable OIDC/SSO login for supported identity providers.
- [ ] Add mobile-friendly access and notifications.
- [ ] Add advanced reports and webhooks.
- [ ] Add multi-user sharing, audit history, and granular permissions.
- [ ] Validate premium integrations and collaboration features with users.

## V1 release status

- [x] Release Lantern V1 as `v1.0.0`.
- [x] Add V1 README, branding, screenshots, and MIT license.
- [x] Make dark mode the default theme while preserving saved user preferences.
- [x] Add local multi-user authentication with administrator settings and member roles.

## Current work

- [x] Finish and verify editable network/device/rack/IP workflows.
- [x] Commit the editable-inventory slice.
- [x] Commit and push rack faceplates, patch panels, rescan reconciliation, and topology connections.
- [x] Support half-width rack devices sharing one U with left/right placement.
- [x] Persist the overview rack spotlight default locally.
- [x] Allow deletion of visually empty racks with stale device references.
- [x] Add Dell OptiPlex Micro and Lenovo ThinkCentre Tiny half-width profiles.
- [x] Add topology location save/reset controls and hover-only connectors.
- [x] Label topology connections with device/group names and colour-code links.
- [x] Add per-service topology visibility toggles.
- [x] Mirror shared half-width rack units in the overview spotlight.
- [x] Add device deletion controls to the Devices directory.
- [x] Remove topology devices from the map without deleting inventory records.
- [x] Allow deleted devices to return as pending discoveries on a later scan.
- [x] Add top and bottom topology connection handles.
- [x] Add topology-only infrastructure items for panels and cable management.
- [x] Add first-run onboarding guide.
- [x] Pan the topology canvas by dragging empty space.
- [x] Make the topology workspace vertically resizable.
- [x] Add provider-neutral cloud inventory normalization and repeat-import merging.
- [x] Add cloud inventory import API with backup/restore support.
- [x] Add Cloud tab with local JSON/CSV import, filters, account/region details, and resource counts.
- [x] Allow imported EC2 resources to be promoted once into the normal Devices inventory.
- [x] Accept raw AWS Resource Explorer CSV exports directly in the Cloud import flow.
