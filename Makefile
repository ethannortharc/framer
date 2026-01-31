# Framer Project Makefile
# Common commands for development and deployment

.PHONY: help install dev test test-backend test-e2e build docker-build docker-up docker-down clean

# Default target
help:
	@echo "Framer Project Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start development servers (backend + frontend)"
	@echo "  make dev-backend  - Start backend server only"
	@echo "  make dev-frontend - Start frontend server only"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-backend - Run backend tests only"
	@echo "  make test-e2e     - Run E2E tests"
	@echo "  make test-e2e-ui  - Run E2E tests with UI"
	@echo ""
	@echo "Building:"
	@echo "  make build        - Build frontend for production"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build - Build Docker images"
	@echo "  make docker-up    - Start all services"
	@echo "  make docker-down  - Stop all services"
	@echo "  make docker-dev   - Start development environment"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean        - Remove build artifacts"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd src/backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd prototype && npm install
	@echo "Installing Playwright browsers..."
	cd prototype && npx playwright install

# Development
dev: dev-backend dev-frontend

dev-backend:
	@echo "Starting backend server..."
	cd src/backend && uvicorn app.main:get_app --reload --port 8000

dev-frontend:
	@echo "Starting frontend server..."
	cd prototype && npm run dev

# Testing
test: test-backend test-e2e

test-backend:
	@echo "Running backend tests..."
	python -m pytest tests/backend/ -v

test-e2e:
	@echo "Running E2E tests..."
	cd prototype && npm run test:e2e

test-e2e-ui:
	@echo "Running E2E tests with UI..."
	cd prototype && npm run test:e2e:ui

# Building
build:
	@echo "Building frontend..."
	cd prototype && npm run build

# Docker commands
docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting all services..."
	docker-compose up -d
	@echo ""
	@echo "Services started:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  PocketBase: http://localhost:8090/_/"

docker-down:
	@echo "Stopping all services..."
	docker-compose down

docker-dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up

docker-logs:
	docker-compose logs -f

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	rm -rf prototype/.next
	rm -rf prototype/node_modules/.cache
	rm -rf __pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "Clean complete"
