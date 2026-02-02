# Configuration Guide

This directory contains environment-specific configuration files for the Framer application.

## Directory Structure

```
config/
├── .env.common     # Shared settings across all environments
├── .env.dev        # Development environment
├── .env.qa         # QA/Staging environment
├── .env.prod       # Production environment
└── README.md       # This file
```

## Usage

### Quick Start (Development)

```bash
# From project root
docker-compose --env-file config/.env.dev up -d
```

### Using Different Environments

```bash
# Development
docker-compose --env-file config/.env.dev up -d

# QA/Staging
docker-compose --env-file config/.env.qa up -d

# Production
docker-compose --env-file config/.env.prod up -d
```

### Using the Helper Script

```bash
# Start services
./scripts/docker.sh dev up

# Stop services
./scripts/docker.sh dev down

# View logs
./scripts/docker.sh dev logs

# Rebuild and start
./scripts/docker.sh dev up --build
```

## Configuration Variables

### Ports

| Variable | Default | Description |
|----------|---------|-------------|
| `POCKETBASE_PORT` | 8090 | PocketBase external port |
| `BACKEND_PORT` | 8000 | FastAPI backend external port |
| `FRONTEND_PORT` | 3000 | Next.js frontend external port |

### Service URLs

| Variable | Description |
|----------|-------------|
| `POCKETBASE_INTERNAL_URL` | URL for services to reach PocketBase (within Docker network) |
| `BACKEND_INTERNAL_URL` | URL for services to reach backend (within Docker network) |
| `POCKETBASE_EXTERNAL_URL` | URL for clients to reach PocketBase |
| `BACKEND_EXTERNAL_URL` | URL for clients to reach backend |
| `FRONTEND_EXTERNAL_URL` | URL for clients to reach frontend |

### Frontend Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | http://localhost:8000 | API URL for frontend |
| `NEXT_PUBLIC_POCKETBASE_URL` | http://localhost:8090 | PocketBase URL for frontend |
| `NEXT_PUBLIC_API_TIMEOUT` | 30000 | API request timeout (ms) |

### Backend Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_DATA_PATH` | /data | Data storage path in container |
| `BACKEND_LOG_LEVEL` | info | Logging level (debug/info/warning/error) |
| `BACKEND_CORS_ORIGINS` | http://localhost:3000 | Allowed CORS origins (comma-separated) |

### Container Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPOSE_PROJECT_NAME` | framer | Docker Compose project name |
| `RESTART_POLICY` | unless-stopped | Container restart policy |
| `HEALTHCHECK_INTERVAL` | 10s | Health check interval |
| `HEALTHCHECK_TIMEOUT` | 5s | Health check timeout |
| `HEALTHCHECK_RETRIES` | 5 | Health check retry count |

## Creating a New Environment

1. Copy an existing environment file:
   ```bash
   cp config/.env.dev config/.env.staging
   ```

2. Update the values for your environment

3. Use it with Docker Compose:
   ```bash
   docker-compose --env-file config/.env.staging up -d
   ```

## Security Notes

- **Never commit sensitive values** (passwords, API keys) to version control
- Use environment variables or secrets management for production
- The `.env.prod` file should only contain non-sensitive defaults
- Consider using Docker secrets or external secrets management (Vault, AWS Secrets Manager)

## Local Development Override

For local customization without modifying tracked files:

1. Create a local override file:
   ```bash
   cp config/.env.dev config/.env.local
   ```

2. Add `config/.env.local` to `.gitignore`

3. Use it:
   ```bash
   docker-compose --env-file config/.env.local up -d
   ```
