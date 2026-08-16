# Lantern V1 — product context and roadmap

Lantern is a local-first, visual infrastructure inventory tool for homelabs. It is inspired by NetBox, but intentionally focuses on the small set of workflows a homelab owner needs: IPAM, safe network discovery, rack organisation, and a clear visual dashboard.

## Release status

Lantern V1 was released as `v1.0.0` on 16 August 2026. The core application is MIT licensed and self-hostable. Lantern Cloud is a separate hosted convenience offering built around the same product boundary; hosted services may be operated commercially without restricting the MIT-licensed core.

## Product promise

> See what is in your homelab, where it lives, how it connects, and what changed.

Lantern is documentation and situational awareness. It is not intended to become a monitoring, configuration-management, ticketing, or enterprise approval platform.

## Audience and scale

The first audience is small-to-medium homelabs:

- One to three sites
- Up to approximately ten racks
- Up to approximately 500 devices or IP records
- Users who prefer a local, privacy-friendly tool and may not want enterprise administration overhead

The interface should be welcoming to a beginner while preserving a clean data model for enthusiast labs.

## Product model

Lantern has two valid deployment options:

1. **User-hosted Lantern:** the user runs the complete application on a home server, NAS, VM, or Docker host. The app works without internet access and the inventory remains on the user's infrastructure.
2. **Vendor-hosted Lantern Cloud:** an optional managed service operated by us. It adds convenience features such as remote access, hosted backups, sync, notifications, and managed updates.

Advanced users should also be able to self-host the cloud companion instead of using our hosted service. The hosted product is a convenience layer, not a requirement for the core application.

## Open-source boundary

The open-source core is a complete and useful product, not a crippled trial. It includes:

- Dashboard
- Manual inventory
- IPAM
- Sites, rooms, racks, devices, interfaces, networks, VLANs, and IPs
- 2D rack and homelab map views
- Lightweight discovery
- Discovery review and confirmation
- Local accounts
- Import/export
- Local backups
- Basic audit/change history
- Cloud inventory imports, including AWS Resource Explorer CSV data
- Local multi-user authentication with administrator and member roles

Paid features should charge for convenience, collaboration, automation, and hosted infrastructure—not basic ownership of inventory data.

## MVP user workflow

### 1. Shape the homelab

An onboarding flow creates a default site and lets the user optionally add rooms, racks, rack units, networks/VLANs, and scan targets. Users are not forced to model the entire homelab before using the app.

### 2. Discover and confirm

Discovery is opt-in and explicitly targeted at selected subnets. The initial scanner is lightweight and agentless:

- Reachability/live-host checks
- ARP/MAC information where the host environment permits it
- Hostname lookup
- Vendor identification
- Restrained common-port checks

Results appear in a review queue. The user can create a device, attach the observation to an existing device, ignore it, or merge it. Scan observations retain source and last-seen timestamps.

### 3. Organise visually

Confirmed devices can be assigned to a site, room, rack, and rack units, or left as standalone equipment. Rack placement is manual in the MVP, with future suggestions based on device dimensions and names.

## MVP functional requirements

### Dashboard

- Device count
- IP allocation and network capacity
- Rack count and occupancy
- Pending discovery observations
- Recently changed inventory
- Incomplete/unassigned records
- Scan health and last-run information

### IPAM

- IPv4 support in V1; IPv6 remains planned
- CIDR networks/subnets
- VLAN number and name
- IP address records
- Reservations and hostnames
- Interface-to-device relationships
- Search and filtering
- Safe address calculations

### Physical inventory

- Sites and rooms
- Racks and rack height
- Devices and device types
- Rack-unit placement
- Front rack elevation in 2D
- Simple standalone-device/map grouping
- Collision prevention for rack units

### Discovery

- Explicit scan target configuration
- Scan disabled until started
- Progress and partial failure visibility
- Review queue
- Confirm, merge, ignore, and dismiss actions
- No destructive automatic updates or deletions

### Data ownership

- Local persistence
- Documented import/export format
- Local backup and restore
- No internet dependency for core workflows

## Technical architecture

The V1 deployment is a Docker-first modular monolith:

- One web/API application container
- PostgreSQL through Docker Compose for persistent deployments
- JSON persistence fallback for simple local development
- Clear internal modules for inventory, IPAM, discovery, visualisation, authentication, and audit history
- A future worker boundary for scans, imports, exports, and scheduled jobs

Docker Compose is the supported deployment. The application remains intentionally simple until background jobs and larger-scale integrations justify a separate worker or service boundary.

## Safety and security defaults

- Scanning is off by default.
- Scan targets are explicit.
- No destructive automatic changes.
- Discovered records require confirmation.
- Credentials for future integrations must be stored separately from ordinary notes.
- The app should be usable on a trusted local network without exposing it publicly.
- Hosted sync must use encrypted transport and encrypted backup data.

## Roadmap

### Phase 1 — V1 shipped

- Docker deployment
- Dashboard
- IPv4 IPAM
- Sites, rooms, racks, devices, interfaces, VLANs, and IPs
- 2D rack elevation and simple map
- Lightweight discovery and review queue
- Import/export, local persistence, PostgreSQL persistence, and basic change history
- Service inventory, topology visualisation, cloud imports, local authentication, and browser smoke coverage

### Phase 2 — homelab integrations

- Service-aware discovery
- Scheduled scans and change alerts
- Agent-based server inventory
- Proxmox integration
- VMware integration
- TrueNAS integration
- Docker and Kubernetes integrations
- Hardware, operating-system, disk, and service details
- Better topology visualisation
- Background worker for long-running scans and scheduled jobs
- IPv6 support

### Phase 3 — paid convenience and collaboration

- Managed Lantern Cloud hosting
- Encrypted off-site backups and restore points
- Secure remote access without exposing the local app
- Mobile-friendly access and notifications
- Cross-installation synchronisation
- Managed update/support channels
- Advanced reports and webhooks
- Configurable OIDC/SSO login with provider-neutral role and group mapping
- Multi-user sharing, audit history, and granular permissions

The self-hosted version of the cloud companion should remain available for privacy-conscious users.

## MVP acceptance criteria

A homelab user must be able to:

1. Start Lantern with Docker Compose.
2. Open a dashboard showing the current inventory.
3. Create or edit a site, rack, network, and device.
4. Run a scan against an explicitly selected subnet.
5. Review discovered observations safely.
6. Confirm a device and associate its IP address.
7. Search network/address information.
8. Place devices into a 2D rack view.
9. See recent changes and pending work.
10. Export and restore the inventory without vendor dependence.
11. Use the core app without internet access.

## Tests and quality gates

Test the following before calling the MVP complete:

- IPv4 CIDR calculations and usable ranges
- Duplicate and conflicting IPs
- Full and tiny subnets
- Scan failures and partial scan results
- Discovery confirmation, merge, ignore, and dismissal
- Rack-unit collisions and multi-unit devices
- Import/export round trips
- Backup restoration
- API validation and error responses
- Browser smoke test for dashboard, IPAM, rack view, scanning, and confirmation

## Current implementation status

V1 is released and includes:

- Docker Compose deployment with persistent named volumes
- Optional PostgreSQL persistence and JSON development fallback
- Dashboard, IPAM, rack map, device directory, services, topology, sites, discovery, and cloud views
- Realistic 2D rack-mounted faceplates and half-width device placement
- Opt-in bounded discovery with review, merge, ignore, rescan, and service classification
- Local multi-user authentication, administrator settings, and member roles
- AWS Resource Explorer CSV import and provider-neutral cloud inventory
- Dark mode by default with responsive layouts
- 58 automated tests including API integration, authentication, persistence, and browser smoke coverage

The next major engineering boundary is a background worker for long-running scans and scheduled jobs. OIDC/SSO, IPv6, agent inventory, hosted sync, remote access, notifications, and managed updates remain post-V1 roadmap work.
