# Deployment — CI/CD to AWS EC2

Blue Satchel deploys to a single Amazon Linux EC2 instance via GitHub
Actions, using a blue/green swap for the API (Docker containers on two
ports, health-checked before traffic switches) and an atomic symlink swap
for the static client build. A failed deploy never takes the site down —
the previous version just keeps serving until a new one passes its health
check.

```
GitHub push to main
   ├─ build-server-image   → Docker image built & pushed to ghcr.io
   ├─ build-client          → `npm run build`, uploaded as an artifact
   └─ deploy (needs both)
        ├─ rsync client build + deploy scripts to the EC2 box
        ├─ deploy-client.sh  → atomic symlink swap (client-current -> new release)
        ├─ deploy-server.sh  → start new container on the inactive color/port,
        │                      health-check it, flip Nginx upstream + reload,
        │                      drain and remove the old container
        └─ smoke test the live URL
```

Nginx on the box is the single public entry point (port 80): it serves the
client's static files directly and reverse-proxies `/api/` and `/uploads/`
to whichever color (blue :5001 / green :5002) is currently active. The two
server ports are bound to `127.0.0.1` only — never exposed directly.

## One-time setup (per server)

1. **Add these GitHub repo secrets** (Settings → Secrets and variables →
   Actions):

   | Secret | Value |
   |---|---|
   | `EC2_HOST` | `3.109.152.217` |
   | `EC2_USER` | `ec2-user` |
   | `EC2_SSH_KEY` | the full contents of your `.pem` private key |

   `GITHUB_TOKEN` (used to push/pull the server image via GHCR) is provided
   automatically — nothing to add for that.

   Never commit the `.pem` file — it's already covered by `.gitignore`.

2. **Open port 80** on the EC2 instance's Security Group (AWS Console →
   EC2 → Security Groups → inbound rule: HTTP, TCP 80, source
   `0.0.0.0/0`). This can't be done over SSH — it's an AWS-side setting.

3. **Run the "Setup EC2 Server (one-time)" workflow** (Actions tab → select
   it → Run workflow). It installs Docker + Nginx, creates
   `/opt/blue-satchel`, and writes a `server.env` template — it will not
   touch anything if run again later (every step checks first).

4. **Edit the real secrets on the box**: SSH in and fill in
   `/opt/blue-satchel/server.env` (`MONGO_URI`, `JWT_SECRET`, etc.) — this
   file is created once from a template and is intentionally never written
   to by CI/CD, so production secrets never pass through GitHub.

5. Push to `main` (or re-run the "Deploy" workflow) for the first real
   deploy.

## Routine deploys

Just push to `main`. That's the whole pipeline — no manual steps, no
re-running setup, no SSH needed day to day.

## Rollback

The last 5 client releases are kept in `/opt/blue-satchel/releases/`. To
roll back the client instantly:

```bash
ln -sfn /opt/blue-satchel/releases/<older-sha>/client-dist /opt/blue-satchel/client-current
```

To roll back the server, redeploy an older image tag:

```bash
bash /opt/blue-satchel/deploy/deploy-server.sh ghcr.io/<owner>/blue-satchel-server:<older-sha>
```

## Data that persists across deploys

- Uploaded scan photos: bind-mounted host directory `/opt/blue-satchel/uploads`
  (not baked into the image, not lost on redeploy).
- The database itself is MongoDB Atlas (external), unaffected by anything
  on this box.
