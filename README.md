<p align="center">
  <img src="docs/images/lantern-logo.svg" alt="Lantern" width="420" />
</p>

<p align="center">
  <strong>Visual inventory for homelabs.</strong><br />
  IPAM, rack organisation, services, topology, and cloud inventory in one calm interface.
</p>

<p align="center">
  <a href="https://github.com/kallum-cooper/lantern/releases/tag/v1.0.0"><img src="https://img.shields.io/github/v/release/kallum-cooper/lantern?display_name=tag&sort=semver&style=flat-square&label=release" alt="Latest release" /></a>
  <a href="https://github.com/kallum-cooper/lantern/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-62d19a?style=flat-square" alt="MIT license" /></a>
  <a href="https://github.com/kallum-cooper/lantern"><img src="https://img.shields.io/github/stars/kallum-cooper/lantern?style=flat-square" alt="GitHub stars" /></a>
</p>

<p align="center">
  <a href="#quick-start-with-docker-compose">Get started</a> ·
  <a href="#features">Features</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

# Lantern

Lantern is a self-hosted IPAM, rack organiser, service inventory, and topology viewer for people who want to understand their lab without running a full data-centre management platform.

It is inspired by NetBox, but deliberately smaller, more visual, and easier to get running.

> **V1 released** — Lantern is usable for a local homelab, but it is still an early project. Back up your data before upgrading and keep the first deployment on a trusted network.

## Screenshots

### Dashboard and rack spotlight

![Lantern dashboard with rack spotlight and service status](docs/images/lantern-overview.png)

### Rack map

![Lantern rack map with rack-mounted device faceplates](docs/images/lantern-rack-spotlight.png)

### Topology

![Lantern topology visualisation](docs/images/lantern-topology.png)

## Features

- IPAM with networks, used addresses, unused addresses, descriptions, reservations, and editing
- Opt-in network discovery with bounded scanning, progress, reverse DNS, common service detection, and review before inventory changes
- Rack organisation with 2D front-elevation views and realistic rack-mounted faceplates
- Common device profiles for servers, switches, routers, NAS devices, UPS units, patch panels, UniFi equipment, Dell and Lenovo tiny PCs, and more
- Half-width rack devices for side-by-side mini PCs
- Device directory linking hardware, rack position, IP address, services, topology, VMs, and containers
- Service inventory for Docker-style workloads and manually recorded applications
- Optional service health checks and overview dashboard visibility
- Drag-and-drop topology map with groups, connectors, infrastructure items, zooming, panning, and saved locations
- Multiple sites with expandable rack, network, and device details
- Cloud inventory with provider-neutral imports and native AWS Resource Explorer CSV support
- Local multi-user authentication with administrator and member roles
- Dark mode and responsive layouts
- JSON persistence by default, with optional PostgreSQL persistence through Docker Compose
- Backup export and import

## Who it is for

Lantern is aimed at homelabbers, self-hosters, small offices, and anyone who wants a useful visual record of their physical and logical infrastructure without adopting a large DCIM system.

It is a good fit if you want to answer questions such as:

- What is using this IP address?
- What is installed in U7 of my rack?
- Which services are running on this host?
- Which devices are at this site?
- What does my network look like at a glance?
- Which AWS resources belong to this environment?

## Why Lantern?

NetBox is powerful and extensible, but it can be more system than a homelab needs. Lantern focuses on the everyday workflow:

1. Start the app.
2. Add a site, network, rack, or device.
3. Scan a network when you choose.
4. Review what was found.
5. Place hardware in a rack.
6. Record the services and connections that matter.

The result is a calm, visual inventory that stays useful as the lab grows.

## Quick start with Docker Compose

Requirements:

- Docker Engine
- Docker Compose v2

Clone the repository and start Lantern:

```sh
git clone https://github.com/kallum-cooper/lantern.git
cd lantern
docker compose up -d --build
```

Open:

```text
http://localhost:4173
```

On first launch, Lantern asks you to create an administrator account. Additional users can be managed from **Settings** by an administrator.

Stop the application without deleting its data:

```sh
docker compose down
```

Start it again later:

```sh
docker compose up -d
```

## Data and persistence

The Compose deployment uses two named Docker volumes:

- `lantern-data` for Lantern’s application data and backup-compatible state
- `lantern-postgres` for PostgreSQL data

Stopping or recreating the Lantern container does not remove these volumes. Do not use `docker compose down -v` unless you intend to delete the stored inventory and database.

Lantern can also run without PostgreSQL for development or a simple single-container deployment. In that mode it stores JSON state at `data/lantern.json`.

## Discovery safety

Discovery is opt-in. Lantern does not scan a network until you start a scan.

The scanner:

- Requires a selected network.
- Rejects targets larger than the built-in safety limit.
- Checks a bounded set of common TCP ports.
- Uses reverse DNS when available.
- Classifies likely services and device roles from observations.
- Keeps new observations pending until you confirm, ignore, or merge them.
- Can rescan known devices and reconcile additional service information.

Discovery is intended for networks you own or administer. Do not scan networks without permission.

## AWS cloud imports

The Cloud section accepts provider-neutral resource exports and the raw CSV-shaped output from AWS Resource Explorer.

Import path:

1. Open **Cloud**.
2. Choose **Import resources**.
3. Select the AWS CSV file.
4. Review valid and invalid rows.
5. Import the accepted resources.

Cloud records remain separate from physical devices until you choose to promote an EC2 resource into the normal inventory.

## Run from source

Requirements:

- Node.js 18 or newer

Install dependencies and start Lantern:

```sh
npm install
npm start
```

Open `http://localhost:4173`.

Useful commands:

```sh
npm test
npm run check
```

The server can be configured with:

```sh
PORT=4173
LANTERN_DATA=./data/lantern.json
LANTERN_DATABASE_URL=postgres://user:password@host:5432/lantern
```

## Authentication and deployment

V1 includes local accounts with administrator and member roles. Passwords are hashed and sessions use HTTP-only cookies.

For a trusted local deployment, the default Compose setup is sufficient. If you expose Lantern beyond your LAN:

- Put it behind HTTPS and a reverse proxy.
- Change the default PostgreSQL credentials in `docker-compose.yml`.
- Keep database ports private.
- Back up the inventory before upgrades.
- Prefer a private network or VPN for remote access.

Configurable OIDC/SSO is planned for the paid roadmap; it is not included in V1.

## V1 scope

V1 is intentionally focused on local inventory:

- IPAM
- network discovery
- racks and physical placement
- devices and services
- topology visualisation
- cloud inventory imports
- local users

The following are not included yet: scheduled background scans, IPv6, agent-based inventory, OIDC/SSO, hosted sync, remote access, notifications, and managed updates.

## Roadmap

Paid convenience features currently planned include:

- Configurable OIDC/SSO login
- Managed Lantern Cloud hosting
- Encrypted off-site backups and restore points
- Secure remote access
- Notifications and cross-installation synchronisation
- Managed update and support channels
- Advanced reports and webhooks

The core self-hosted inventory remains the foundation of the project.

## Contributing

Issues, ideas, screenshots, and pull requests are welcome. If you are changing discovery, persistence, authentication, or rack placement, please include tests for the behaviour you are changing.

Run the test suite before opening a pull request:

```sh
npm test
```

## License

Lantern is released under the [MIT License](LICENSE).
