#!/bin/bash
# Docker Compose helper script for managing different environments
#
# Usage:
#   ./scripts/docker.sh <env> <command> [options]
#
# Environments:
#   dev     - Development environment
#   qa      - QA/Staging environment
#   prod    - Production environment
#   local   - Local override (if config/.env.local exists)
#
# Commands:
#   up      - Start services (add --build to rebuild)
#   down    - Stop services
#   restart - Restart services
#   logs    - View logs (add -f to follow)
#   ps      - List running containers
#   build   - Build images
#   pull    - Pull latest images
#   exec    - Execute command in container
#   shell   - Open shell in container
#
# Examples:
#   ./scripts/docker.sh dev up
#   ./scripts/docker.sh dev up --build
#   ./scripts/docker.sh prod down
#   ./scripts/docker.sh dev logs -f
#   ./scripts/docker.sh dev shell backend
#   ./scripts/docker.sh dev exec backend python -c "print('hello')"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/config"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Show usage
usage() {
    echo "Usage: $0 <env> <command> [options]"
    echo ""
    echo "Environments: dev, qa, prod, local"
    echo "Commands: up, down, restart, logs, ps, build, pull, exec, shell"
    echo ""
    echo "Examples:"
    echo "  $0 dev up           # Start development environment"
    echo "  $0 dev up --build   # Rebuild and start"
    echo "  $0 prod down        # Stop production"
    echo "  $0 dev logs -f      # Follow logs"
    echo "  $0 dev shell backend # Open shell in backend container"
    exit 1
}

# Validate environment
validate_env() {
    local env=$1
    case $env in
        dev|qa|prod|local)
            ENV_FILE="$CONFIG_DIR/.env.$env"
            if [[ ! -f "$ENV_FILE" ]]; then
                error "Environment file not found: $ENV_FILE"
            fi
            ;;
        *)
            error "Invalid environment: $env. Use: dev, qa, prod, or local"
            ;;
    esac
}

# Main execution
main() {
    if [[ $# -lt 2 ]]; then
        usage
    fi

    local env=$1
    local command=$2
    shift 2

    validate_env "$env"

    info "Using environment: $env ($ENV_FILE)"

    cd "$PROJECT_ROOT"

    case $command in
        up)
            info "Starting services..."
            docker-compose --env-file "$ENV_FILE" up -d "$@"
            info "Services started. Use '$0 $env logs -f' to view logs."
            ;;
        down)
            info "Stopping services..."
            docker-compose --env-file "$ENV_FILE" down "$@"
            info "Services stopped."
            ;;
        restart)
            info "Restarting services..."
            docker-compose --env-file "$ENV_FILE" restart "$@"
            info "Services restarted."
            ;;
        logs)
            docker-compose --env-file "$ENV_FILE" logs "$@"
            ;;
        ps)
            docker-compose --env-file "$ENV_FILE" ps "$@"
            ;;
        build)
            info "Building images..."
            docker-compose --env-file "$ENV_FILE" build "$@"
            info "Build complete."
            ;;
        pull)
            info "Pulling latest images..."
            docker-compose --env-file "$ENV_FILE" pull "$@"
            info "Pull complete."
            ;;
        exec)
            if [[ $# -lt 1 ]]; then
                error "exec requires a service name and command"
            fi
            docker-compose --env-file "$ENV_FILE" exec "$@"
            ;;
        shell)
            if [[ $# -lt 1 ]]; then
                error "shell requires a service name"
            fi
            local service=$1
            info "Opening shell in $service..."
            docker-compose --env-file "$ENV_FILE" exec "$service" /bin/sh -c "command -v bash >/dev/null && exec bash || exec sh"
            ;;
        *)
            error "Unknown command: $command"
            ;;
    esac
}

main "$@"
