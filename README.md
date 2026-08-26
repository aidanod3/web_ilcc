# ILCC — web assembler & debugger for the LCC

Browser-based assembler, interpreter, and step debugger for the **LCC** (Low Cost Computer), the 16-bit teaching ISA from *C and C++ Under the Hood* used in SUNY New Paltz's computer-architecture course. Hosted at **https://hydra.newpaltz.edu/ilcc**.

Also serves the course software downloads (SSO) and a TA autograder (SSO + staff role).

## Layout

```
client/   React 19 + Vite 8 + CodeMirror 6 (CSS Modules)
server/   Express 5 + ws — assembles/runs LCC in worker threads, SQLite, SSO-aware routes
server/src/web_ilcc/     the assembler + interpreter the app actually runs
server/src/reference/    vendored upstream interactive_lccjs (tests, docs) — not imported at runtime
```

## Run locally

```bash
nvm use            # Node 22 (.nvmrc)
cd server && npm ci && cp .env.example .env && npm run dev     # :3000
cd client && npm ci && npm run dev                              # :5173, proxies /api → :3000
```

Open http://localhost:5173. SSO-gated pages (downloads, autograder) need `X-Hydra-Email` / `X-Hydra-Roles` headers — in dev, set `TRUSTED_PROXY_CIDR=0.0.0.0/0` and add them with a browser extension, or run behind Traefik.

## Test

```bash
cd server && npm test            # vitest: routes, auth, grader, zip ingest
cd server && npm run test:lcc    # jest: assembler/interpreter suites ported from reference/
cd client && npm test            # vitest: hooks, editor, isa data
cd client && npm run test:e2e    # playwright: run/debug/share/tour/autograder flows
```

## Build & deploy

Single image: Vite builds the client, Express serves `client/dist` plus the API/WebSockets.

```bash
docker build --build-arg VITE_BASE=/ilcc/ -t ilcc .
```

Production deploy is done from the Hydra control node with `hydra-saml-auth/scripts/deploy-ilcc.sh` (buildah → containerd import → `kubectl set image`). Manifests live in `hydra-saml-auth/k8s/components/ilcc/`. See `docs/DEPLOY.md`.

## Environment

See `server/.env.example`. Identity is never read from cookies — Traefik's forward-auth injects `X-Hydra-User/Email/Roles`, which the server trusts only from `TRUSTED_PROXY_CIDR` with the matching `HYDRA_PROXY_SECRET`.

## WebSocket protocol

`/api/run` and `/api/debug` — see `server/src/routes/{run,debug}.js` headers for message shapes.

## Contributing

Work happens on `ndg8743/web_ilcc`. Branch from `main`, open a PR; CI runs lint, unit, integration, build, audit, and Playwright. Upstream student branches are being hand-ported into this layout — see the closed PRs on `aidanod3/web_ilcc` for what landed where.
