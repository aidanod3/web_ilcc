# Deploying ILCC to Hydra

Prod: **https://hydra.newpaltz.edu/ilcc** · namespace `hydra-infra` · one pod.

## Day-to-day

```bash
# on the Hydra control node, as infra
/home/infra/hydra-saml-auth/scripts/deploy-ilcc.sh            # main → build → import → roll → smoke
/home/infra/hydra-saml-auth/scripts/deploy-ilcc.sh --ref my-branch
/home/infra/hydra-saml-auth/scripts/deploy-ilcc.sh --rollback
/home/infra/hydra-saml-auth/scripts/deploy-ilcc.sh --sync-downloads   # after changing a course file in /home/infra
```

The script: pulls this repo to `/home/infra/web_ilcc`, `buildah bud --build-arg VITE_BASE=/ilcc/`, imports the image into RKE2's containerd (there is no registry), tags it `docker.io/ndg8743/ilcc:<date>` (image name only — containerd needs a registry-style name; no push happens), applies `k8s/components/ilcc/` from hydra-saml-auth, `kubectl set image`, waits for readiness through Traefik, and runs smoke checks.

## Where things live

| what | where |
|---|---|
| manifests | `hydra-saml-auth/k8s/components/ilcc/` (Deployment, Service, PVCs, Middleware, IngressRoute, CronJob) |
| secret | `ilcc-secret` in-cluster: `HYDRA_PROXY_SECRET`, `SEED_ADMINS` — never in git |
| SQLite DB + nightly backups | PVC `ilcc-data` → `/data/ilcc.db`, `/data/backups/` |
| course zips + textbook | PVC `ilcc-downloads` → `/data/downloads/` (synced from `/home/infra/*.zip`, `*.pdf`) |
| logs | `kubectl -n hydra-infra logs deploy/ilcc -f` (pino JSON) |

## Auth model

- Traefik `hydra-forward-auth` (hydra-system) validates the SAML session cookie via hydra-auth and returns `X-Hydra-User/Email/Roles`.
- A second middleware `ilcc-proxy-secret` adds `X-Hydra-Proxy-Secret`. The app only trusts identity headers from the pod CIDR **and** with that secret (`server/src/middleware/auth.js`).
- Public: editor, `/setup`, `/faq`, `/docs`, `/examples`, demos, run/debug WebSockets, download manifest.
  SSO: `/downloads`, `/materials`, `/my-submissions`, file downloads, submissions.
  Staff: `/autograder`, `/api/grader/*` (TA+), `/api/staff` (admin).
- Faculty (SAML affiliation) become admins on first sign-in; `SEED_ADMINS` adds explicit ones; admins add TAs in the app (User menu → Staff).
- The IngressRoute rule **must be one line** — Traefik v3 rejects YAML folded blocks and silently disables the router.

## Data safety

Both PVCs are `hydra-local` with `reclaimPolicy: Delete`. **Never `kubectl delete pvc`.** Pin the PVs to Retain after first bind (see `k8s/components/ilcc/README.md`). The CronJob keeps 14 nightly `.db.gz` backups on `ilcc-data`; copy them off-node periodically:

```bash
kubectl -n hydra-infra cp $(kubectl -n hydra-infra get pod -l app=ilcc -o name | cut -d/ -f2):/data/backups /home/infra/backups/ilcc/
```

## Course files

Rebuild the all-platform zip when upstream ships a new package, then sync:

```bash
scripts/build-unified-cuh63.sh /home/infra /home/infra/cuh63.zip
/home/infra/hydra-saml-auth/scripts/sync-ilcc-downloads.sh
```

## Student sandbox

Aidan's dev copy at `/students/odonnela6/ilcc/` is unrelated to prod and untouched. Prod deploys from this repo's `main`.
