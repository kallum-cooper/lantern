# Lantern

Lantern is a simple, visual IPAM and homelab inventory app inspired by NetBox.

## Run locally

Requirements: Node.js 18 or newer. No package install is required.

```sh
node server.js
```

Open http://localhost:4173.

Useful commands:

```sh
node --test
node --check server.js
```

The local JSON database is created at `data/lantern.json`. Set `PORT` or `LANTERN_DATA` to customise the server.

See [PLAN.md](PLAN.md) for the product context, scope, safety defaults, and roadmap.
