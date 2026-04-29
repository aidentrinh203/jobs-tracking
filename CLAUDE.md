# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Taskosaur is an open-source project management platform with Conversational AI Task Execution. The AI assistant can navigate the UI in real-time to execute tasks through natural conversation.

**Tech Stack:**
- Backend: NestJS (TypeScript) on port 3000
- Frontend: Next.js 16 + React 19 on port 3001
- Database: PostgreSQL 16+ with Prisma ORM
- Cache/Queue: Redis 7+ with BullMQ
- Real-time: Socket.IO for WebSocket connections
- Auth: JWT with Passport (local + JWT strategies)

## Development Commands

### Starting the Application

```bash
# Recommended: Docker Compose (auto-bootstraps everything)
docker compose -f docker-compose.dev.yml up

# Manual: Both frontend and backend
npm run dev

# Individual services
npm run dev:frontend  # Next.js on port 3001
npm run dev:backend   # NestJS on port 3000
```

### Database Operations

All seed commands are **idempotent** (safe to run multiple times):

```bash
npm run db:migrate         # Run migrations (development)
npm run db:migrate:deploy  # Deploy migrations (production)
npm run db:reset           # Reset database (deletes ALL data)
npm run db:seed            # Seed with sample data (idempotent)
npm run db:seed:admin      # Seed admin user only (idempotent)
npm run db:generate        # Generate Prisma client
npm run db:studio          # Open Prisma Studio GUI

# Access Prisma CLI directly
npm run prisma -- [command]
```

### Testing

```bash
npm run test               # All tests
npm run test:backend       # Backend unit tests
npm run test:watch         # Backend tests in watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # Backend E2E tests
npm run test:frontend      # Frontend Playwright tests
```

### Code Quality

```bash
npm run lint               # Lint all workspaces
npm run lint:frontend      # Lint frontend
npm run lint:backend       # Lint backend
npm run format             # Format backend code (Prettier)
```

**Pre-commit Hook:** Husky automatically runs linters on commit. Only bypass with `--no-verify` in emergencies.

## Architecture

### Monorepo Structure

This is an npm workspaces monorepo:
- Root `package.json` orchestrates both workspaces
- All scripts run from root directory
- Environment variables in `.env` at root (loaded via `dotenv-cli`)

### Backend Architecture (`backend/src/`)

**NestJS Feature Modules** (`modules/`):
- `auth/` - JWT authentication with Passport (local + JWT strategies)
- `users/`, `organizations/`, `workspaces/`, `projects/`, `tasks/` - Core domain entities
- `ai-chat/` - Conversational AI Task Execution (navigates UI to perform actions)
- `queue/` - Background job processing with BullMQ (adapters for Bull/BullMQ/BetterQueue)
- `inbox/` - Email integration (IMAP inbox monitoring)
- `automation/` - Workflow automation rules
- `activity-log/`, `notifications/` - Audit trail and real-time notifications
- `search/` - Global search across entities
- `storage/` - S3 or local file storage for attachments

**Gateway** (`gateway/`):
- `events.gateway.ts` - Socket.IO WebSocket gateway for real-time updates
- Handles notifications, activity events, live updates

**Prisma** (`backend/prisma/`):
- `schema.prisma` - Database schema (single source of truth)
- `migrations/` - Migration history (managed by Prisma)
- Never edit migrations directly

**Key Patterns:**
- Global JWT auth guard (`JwtAuthGuard`) applied via `APP_GUARD`
- `ActivityNotificationInterceptor` intercepts responses to send real-time notifications
- `RequestContextInterceptor` tracks request metadata
- Validation with `class-validator` and DTOs
- All modules use dependency injection

**Authentication Flow:**
1. Login → `auth/local.strategy.ts` validates credentials
2. Returns JWT access + refresh tokens
3. All API routes protected by `JwtAuthGuard` (except public routes marked with `@Public()`)
4. Token refresh via `/api/auth/refresh` endpoint

### Frontend Architecture (`frontend/src/`)

**Next.js Structure:**
- `pages/` - File-based routing (Next.js Pages Router, not App Router)
- `components/` - React components organized by feature
- `contexts/` - React Context API for state management (auth, organization, workspace, project, task, chat, etc.)
- `hooks/` - Custom React hooks
- `lib/` - Utilities and helpers
- `utils/` - API client, formatters, validators
- `types/` - TypeScript type definitions
- `styles/` - Tailwind CSS styles

**State Management:**
- React Context for global state (no Redux)
- Contexts: `AuthContext`, `OrganizationContext`, `WorkspaceContext`, `ProjectContext`, `TaskContext`, `ChatContext`, `NotificationContext`, `InboxContext`
- API calls via Axios (configured in `utils/api.ts`)

**Real-time Updates:**
- Socket.IO client connects to `/api/socket` on backend
- Listens for events: `notification`, `activity`, `task-update`, etc.
- Auto-updates UI when events received

**Key Components:**
- `chat/` - AI chat interface for Conversational Task Execution
- `kanban/` - Kanban board with drag-and-drop (@dnd-kit)
- `gantt/` - Gantt chart view
- `inbox/` - Email inbox integration
- `tasks/` - Task detail, list, create/edit forms
- `ui/` - Reusable UI components (Radix UI + Tailwind)

### Data Model Hierarchy

```
Organization (top-level tenant)
  └─ Workspace (group of related projects)
      └─ Project (container for tasks)
          └─ Task (work item)
              ├─ TaskComment
              ├─ TaskAttachment
              ├─ TaskLabel
              ├─ TaskWatcher
              ├─ TaskDependency
              └─ TimeEntry
```

**Key Relationships:**
- Organizations are multi-tenant isolators
- Users join organizations via `OrganizationMember`
- Workspaces have `WorkspaceMember`, Projects have `ProjectMember`
- Tasks have assignees, reporters, watchers
- Workflows define custom task statuses per project
- Sprints group tasks for agile planning

## Conversational AI Task Execution

**How It Works:**
- AI Chat module (`backend/src/modules/ai-chat/`) receives natural language commands
- AI uses LLM (OpenAI, Anthropic, OpenRouter, or local) via API
- `app-guide.ts` contains prompts/instructions for AI to navigate the UI
- AI returns instructions to frontend, which executes browser automation
- Frontend simulates clicks, form fills, navigation to complete tasks

**Example Commands:**
- "Create a sprint with high-priority bugs from last week"
- "Move all tasks in 'In Progress' to 'Review' and assign to John"
- "Generate a report of completed tasks this month"

## Environment Variables

Key variables in `.env`:
```env
DATABASE_URL=postgresql://...     # Postgres connection
REDIS_HOST=localhost              # Redis host
REDIS_PORT=6379                   # Redis port

JWT_SECRET=...                    # JWT signing key
JWT_REFRESH_SECRET=...            # Refresh token key
ENCRYPTION_KEY=...                # Encrypt sensitive data (64-char hex)

FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Optional: Email (SMTP) for notifications
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Optional: File uploads
UPLOAD_DEST=./uploads             # Local storage path
MAX_FILE_SIZE=10485760            # Max 10MB
```

## Common Development Tasks

### Adding a New Feature Module

1. Generate NestJS module: `cd backend && npx nest g module modules/feature-name`
2. Create service, controller, DTOs
3. Add to `backend/src/app.module.ts` imports and RouterModule routes
4. Create Prisma models in `schema.prisma` if needed
5. Run `npm run db:migrate` to create migration
6. Add frontend components in `frontend/src/components/feature-name/`
7. Create context in `contexts/` if state management needed

### Adding a New Database Model

1. Edit `backend/prisma/schema.prisma`
2. Run `npm run db:migrate` (automatically generates client + creates migration)
3. Migration files created in `backend/prisma/migrations/`
4. Update TypeScript types in `frontend/src/types/` to match

### WebSocket Events

To emit events from backend:
1. Inject `EventsGateway` into service
2. Call `gateway.server.to(roomId).emit('event-name', data)`
3. Frontend listens via Socket.IO client

### Background Jobs

Queue system auto-selects adapter (BullMQ → Bull → BetterQueue fallback):
1. Define job processor in `backend/src/modules/queue/`
2. Add job to queue via `QueueService`
3. Jobs retry automatically (configurable in `.env`)

## Testing

**Backend Tests:**
- Unit tests: `*.spec.ts` files next to source files
- E2E tests: `backend/test/` directory
- Uses Jest + Supertest
- Database: Uses separate `.env.test` file

**Frontend Tests:**
- E2E tests: Playwright in `frontend/e2e/`
- Run with `npm run test:frontend`

## API Documentation

Swagger docs auto-generated:
- Development: http://localhost:3000/api/docs
- All routes documented via `@ApiOperation`, `@ApiResponse` decorators
- JWT auth configured in Swagger UI (click "Authorize" button)

## Docker Development

`docker-compose.dev.yml` orchestrates:
- PostgreSQL (port 5432, internal only)
- Redis (port 6379, internal only)
- App container (ports 3000, 3001)

Auto-bootstrapping:
- Waits for Postgres/Redis
- Generates Prisma client
- Runs migrations
- Seeds database (idempotent)
- Starts dev servers

**Useful Docker Commands:**
```bash
# Logs
docker compose -f docker-compose.dev.yml logs -f app

# Shell into container
docker compose -f docker-compose.dev.yml exec app sh

# Clean restart
docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up
```

## Troubleshooting

**"Prisma Client not found":**
```bash
npm run db:generate
```

**Database connection errors:**
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Ensure migrations are applied: `npm run db:migrate`

**Redis connection errors:**
- Redis is optional (queue falls back to in-memory)
- Check Redis is running if using Docker
- Verify `REDIS_HOST` and `REDIS_PORT` in `.env`

**Port conflicts:**
- Backend uses port 3000, frontend uses 3001
- Change ports in `docker-compose.dev.yml` or `.env`

**Hot reload not working:**
- Backend: NestJS watch mode enabled by default
- Frontend: Next.js Fast Refresh enabled by default
- If using Docker, ensure volume mounts are correct

## Code Style

- TypeScript strict mode enabled
- ESLint + Prettier configured (runs on pre-commit)
- Backend: Follow NestJS conventions (modules, services, controllers)
- Frontend: React functional components with hooks
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
