# Deployment — CI/CD to AWS EC2

Blue Satchel deploys to a single Amazon Linux EC2 instance via GitHub
Actions. Both the client and server are Docker containers, deployed and
blue/green-swapped **together as one versioned unit** (health-checked
before traffic switches, so a broken build never takes the site down and
client/server are always a matched pair).

```
GitHub push to main
   ├─ build-server-image   → Docker image built & pushed to ghcr.io/<owner>-server
   ├─ build-client-image   → Docker image built & pushed to ghcr.io/<owner>-client
   └─ deploy (needs both)
        ├─ rsync deploy scripts to the EC2 box
        ├─ docker login ghcr.io on the box
        ├─ deploy-app.sh <server-image> <client-image>
        │     → start both new containers on the inactive color's ports
        │     → health-check both directly (bypassing Nginx)
        │     → flip Nginx upstream + reload (graceful, no dropped connections)
        │     → drain and remove the old pair
        └─ smoke test the live URL
```

Nginx on the box is the single public entry point (port 80): it reverse-
proxies `/api/` and `/uploads/` to the active server container and
everything else (`/`) to the active client container. Both containers'
ports are bound to `127.0.0.1` only — never exposed directly, only
reachable through Nginx.

```
Internet ──▶ Nginx :80 ──▶ /api/, /uploads/  ──▶ blue_satchel_api      (bs-server-blue :5001 / bs-server-green :5002)
                       └─▶ /  (everything else) ──▶ blue_satchel_client (bs-client-blue :8081 / bs-client-green :8082)
```

## One-time setup (per server)

1. **Add these GitHub repo secrets** (Settings → Secrets and variables →
   Actions):

   | Secret | Value |
   |---|---|
   | `EC2_HOST` | `3.109.152.217` |
   | `EC2_USER` | `ec2-user` |
   | `EC2_SSH_KEY` | the full contents of your `.pem` private key |

   `GITHUB_TOKEN` (used to push/pull both images via GHCR) is provided
   automatically — nothing to add for that, and no Docker Hub account is
   used anywhere in this pipeline.

   Never commit the `.pem` file — it's already covered by `.gitignore`.

2. **Open port 80** on the EC2 instance's Security Group (AWS Console →
   EC2 → Security Groups → inbound rule: HTTP, TCP 80, source
   `0.0.0.0/0`). This can't be done over SSH — it's an AWS-side setting.

3. **Run the "Setup EC2 Server (one-time)" workflow** (Actions tab → select
   it → Run workflow). It installs Docker + Nginx and writes a
   `server.env` template — it will not touch anything if run again later
   (every step checks first).

4. **Edit the real secrets on the box**: SSH in and fill in
   `/opt/blue-satchel/server.env` (`MONGO_URI`, `JWT_SECRET`, etc.) — this
   file is created once from a template and is intentionally never written
   to by CI/CD, so production secrets never pass through GitHub.

5. Push to `main` (or re-run the "Deploy" workflow) for the first real
   deploy. Until then, Nginx returns 502 on every path — expected, there's
   nothing listening on the upstream ports yet.

## Routine deploys

Just push to `main`. That's the whole pipeline — no manual steps, no
re-running setup, no SSH needed day to day.

## Rollback

Redeploy older image tags directly (both are required, even if only one
changed — they're always swapped as a pair):

```bash
ssh ec2-user@3.109.152.217
bash /opt/blue-satchel/deploy/deploy-app.sh \
  ghcr.io/<owner>/blue-satchel-server:<older-sha> \
  ghcr.io/<owner>/blue-satchel-client:<older-sha>
```

## Data that persists across deploys

- Uploaded scan photos: bind-mounted host directory `/opt/blue-satchel/uploads`
  (not baked into either image, not lost on redeploy).
- The database itself is MongoDB Atlas (external), unaffected by anything
  on this box.
