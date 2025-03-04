# Mycelium ERP - Docker Management Guide

This guide covers everything you need to know about starting, stopping, updating, and completely removing the Docker environment for the Mycelium ERP system.

---

## 🚀 1. Starting Up

To start the entire environment (both the database and the web application) in the background, run:

```bash
sudo docker compose up -d
```

### Forcing a Rebuild
If you have made changes to the application code, `package.json`, or the `Dockerfile`, you must tell Docker to rebuild the application image before starting:

```bash
sudo docker compose up -d --build
```

### Viewing Logs
To check the logs of your running containers (very useful for debugging):
- **All containers:** `sudo docker compose logs -f`
- **Only the app:** `sudo docker compose logs -f app`
- **Only the database:** `sudo docker compose logs -f db`

---

## 🛑 2. Winding Down

When you are done developing or want to temporarily shut off the system, you can gracefully stop the containers.

```bash
sudo docker compose down
```

> **NOTE:** This command stops the containers and removes the default network, but **preserves all your data volumes** (databases and uploaded files). When you run `up` again, you won't lose any data.

---

## 🔄 3. Updating the Application

When a new version of the code is pulled from the repository, you should update the running environment to reflect the new code:

```bash
# 1. Pull the latest code
git pull origin main

# 2. Stop the current environment
sudo docker compose down

# 3. Start it up again and force a rebuild of the app image
sudo docker compose up -d --build
```

---

## 🗑️ 4. Full Removal (Nuking the Environment)

> **CAUTION:** The following commands are highly destructive. They will permanently delete the database and all uploaded files. Use only if you want to start from a completely clean slate.

If you want to wipe the environment clean (e.g. to test a fresh database seed):

```bash
sudo docker compose down -v
```
*(The `-v` flag tells Docker to also delete all associated Named Volumes).*

If you want to clear **everything** out, including cached images and orphaned containers, you can run a full system prune:
```bash
sudo docker system prune -a --volumes
```
