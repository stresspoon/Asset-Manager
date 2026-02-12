# Overview

This is a **consultation management dashboard** (경리아웃소싱 상담 관리 시스템) for a Korean tax accounting firm (천지세무법인). It provides an admin web interface for managing outsourced bookkeeping consultation workflows: consultation requests, scheduling, and automated quote generation.

The system follows a **hybrid architecture** where Notion serves as the primary data store and customer-facing interface (forms, calendar), while this web application provides the admin dashboard and business logic (quote calculation engine).

**Core workflow:** Customer submits consultation request via Notion form → Books a time slot via Notion Calendar → Admin manages everything through this web dashboard → System auto-generates pricing quotes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side router)
- **State/Data Fetching:** TanStack React Query for server state management
- **UI Components:** shadcn/ui (new-york style) built on Radix UI primitives
- **Styling:** Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Build Tool:** Vite with HMR in development
- **Path aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework:** Express.js running on Node with TypeScript (via tsx)
- **API Pattern:** REST endpoints under `/api/` prefix
- **Key modules:**
  - `server/routes.ts` — API route definitions; includes sample/fallback data for when Notion API isn't connected
  - `server/notion.ts` — Notion API client wrapper for reading consultation requests and schedules
  - `server/quote-engine.ts` — Business logic for automatic quote calculation based on tier matching (LITE, BASIC, PREMIUM, LUXURY)
  - `server/storage.ts` — Database access layer using repository pattern (`IStorage` interface with `DatabaseStorage` implementation)
  - `server/db.ts` — Drizzle ORM + PostgreSQL connection pool

### Shared Layer
- `shared/schema.ts` — Single source of truth for database schema (Drizzle ORM), Zod validation schemas, and TypeScript types
- Database tables: `service_pricing` (tier-based pricing reference) and `quotes` (generated quotes)
- Also exports TypeScript types for Notion-sourced data (consultation requests, schedules) that don't have their own DB tables

### Data Flow
- **Notion → Web:** Consultation requests and schedules are read from Notion databases via Notion API (read-only primary data)
- **PostgreSQL:** Stores generated quotes and service pricing tiers (application-generated data)
- **Quote Engine:** Takes consultation parameters (revenue, transaction volume, tax invoices, card usage) and determines the appropriate pricing tier, then calculates fees with optional discounts

### Build & Deployment
- Development: `tsx server/index.ts` with Vite middleware for frontend HMR
- Production: Vite builds frontend to `dist/public/`, esbuild bundles server to `dist/index.cjs`
- Database migrations: `drizzle-kit push` for schema sync

### Pages
| Route | Purpose |
|-------|---------|
| `/` | Dashboard with summary stats |
| `/requests` | List of consultation requests (from Notion) |
| `/requests/:id` | Request detail + quote generation |
| `/schedules` | Schedule management with calendar/list views |
| `/schedules/:id` | Schedule detail with notes and status management |
| `/quotes` | Generated quotes list |
| `/quotes/:id` | Quote detail with editing capability |

## External Dependencies

### Notion API (`@notionhq/client`)
- **Purpose:** Primary data source for consultation requests and schedules
- **Environment variables required:**
  - `NOTION_API_KEY` — Notion integration API token
  - `NOTION_SCHEDULE_DB_ID` — Notion database ID for consultation schedules
- **Notion databases referenced:** Consultation requests DB, Consultation schedules DB, Service pricing DB, Quotes DB (see attached specs for DB IDs)

### PostgreSQL (via `pg` + Drizzle ORM)
- **Purpose:** Stores quotes and service pricing data generated/managed by the web app
- **Environment variable:** `DATABASE_URL`
- **Schema location:** `shared/schema.ts`
- **Migration tool:** drizzle-kit with output to `./migrations`

### Session Store
- `connect-pg-simple` is listed as a dependency for PostgreSQL-backed sessions (session management may not be fully implemented yet)

### Key NPM Packages
- `drizzle-orm` / `drizzle-zod` — ORM and schema-to-validation bridge
- `zod` — Runtime validation
- `wouter` — Client-side routing
- `@tanstack/react-query` — Data fetching/caching
- `lucide-react` — Icon library
- `date-fns` — Date utilities
- `recharts` — Charts (for dashboard)
- `react-day-picker` — Calendar component
- `vaul` — Drawer component