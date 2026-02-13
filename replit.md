# Overview

This is a **consultation management dashboard** (상담 관리 시스템) for a Korean tax accounting firm (천지세무법인). It provides both a **customer-facing consultation request/booking system** and an **admin web interface** for managing two service types: "경리아웃소싱" (accounting outsourcing) and "일반 세무기장" (general tax bookkeeping).

The system follows a **hybrid architecture** where Notion serves as the primary data store, while this web application provides the admin dashboard, customer-facing forms, self-hosted scheduling, and business logic (quote calculation engine).

**Core workflow:** Customer visits /consult/accounting or /consult/tax → Fills multi-step form with business info → Selects services → Books a time slot → Admin manages everything through the admin dashboard → System auto-generates pricing quotes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side router)
- **State/Data Fetching:** TanStack React Query for server state management
- **UI Components:** shadcn/ui (new-york style) built on Radix UI primitives
- **Styling:** Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Design System:** Dark navy sidebar (#1a1f3e), gradient stat cards (blue/amber/emerald/violet), Inter font
- **Build Tool:** Vite with HMR in development
- **Path aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework:** Express.js running on Node with TypeScript (via tsx)
- **API Pattern:** REST endpoints under `/api/` prefix
- **Key modules:**
  - `server/routes.ts` — API route definitions; includes sample/fallback data for when Notion API isn't connected
  - `server/notion.ts` — Notion API client wrapper for CRUD operations on consultation requests, schedules, and quotes
  - `server/quote-engine.ts` — Business logic for automatic quote calculation (accounting: tier matching LITE/BASIC/PREMIUM/LUXURY; tax: revenue-based pricing)
  - `server/storage.ts` — Database access layer using repository pattern (`IStorage` interface with `DatabaseStorage` implementation)
  - `server/db.ts` — Drizzle ORM + PostgreSQL connection pool

### Shared Layer
- `shared/schema.ts` — Single source of truth for database schema (Drizzle ORM), Zod validation schemas, and TypeScript types
- Database tables: `service_pricing` (accounting tier-based pricing), `tax_pricing` (tax bookkeeping pricing by revenue range), and `quotes` (generated quotes)
- Also exports TypeScript types for Notion-sourced data (consultation requests, schedules) that don't have their own DB tables
- `ServiceType` type: `"accounting" | "tax"` used throughout the system

### Data Flow
- **Notion → Web:** Consultation requests and schedules are read from Notion databases via Notion API
- **Web → Notion:** Customer form submissions create request + schedule entries in Notion; Quotes are synced to Notion
- **PostgreSQL:** Stores generated quotes, service pricing tiers, and tax pricing data
- **Quote Engine:** Two calculation modes:
  - Accounting: Takes consultation parameters (revenue, transaction volume, tax invoices, card usage) and determines tier (LITE/BASIC/PREMIUM/LUXURY) with optional 30% one-stop discount
  - Tax: Matches by revenue range + business type (개인/법인) to determine monthly fee

### Build & Deployment
- Development: `tsx server/index.ts` with Vite middleware for frontend HMR
- Production: Vite builds frontend to `dist/public/`, esbuild bundles server to `dist/index.cjs`
- Database migrations: `drizzle-kit push` for schema sync

### Pages
| Route | Purpose | Layout |
|-------|---------|--------|
| `/` | Dashboard with summary stats | Admin (sidebar) |
| `/requests` | List of consultation requests with service type/status filters | Admin |
| `/requests/:id` | Request detail + inline editing + quote generation | Admin |
| `/schedules` | Schedule management with calendar/list views | Admin |
| `/schedules/:id` | Schedule detail with notes and status management | Admin |
| `/quotes` | Generated quotes list | Admin |
| `/quotes/:id` | Quote detail with editing, delete, and download | Admin |
| `/consult/accounting` | Customer-facing accounting outsourcing consultation form | Public (no sidebar) |
| `/consult/tax` | Customer-facing tax bookkeeping consultation form | Public (no sidebar) |

### Key Features
- **Multi-step customer form:** 3 steps (basic info → service selection → schedule booking) with localStorage persistence (30min expiry)
- **Self-hosted scheduling:** Weekdays 10:00-18:00, hourly slots, 30-day booking window, auto-disable booked slots
- **Admin request editing:** Inline edit mode for request fields with save/cancel
- **Quote management:** Auto-calculate, generate, edit, delete, and text download
- **Service type discrimination:** "경리아웃소싱"/"일반세무기장" in Notion, mapped to "accounting"/"tax" internally
- **Dark mode support:** Full light/dark theme toggle

## External Dependencies

### Notion API (`@notionhq/client`)
- **Purpose:** Primary data source for consultation requests, schedules, pricing, and quote sync
- **Environment variables required:**
  - `NOTION_API_KEY` — Notion integration API token
  - `NOTION_REQUEST_DB_ID` — 상담 신청 DB (`fb55ece0fc6646febf66c6492762a508`)
  - `NOTION_SCHEDULE_DB_ID` — 상담 일정 DB (`7bdcf9acc8594ae9a8bb9a834155cddd`)
  - `NOTION_PRICING_DB_ID` — 요금 기준표 DB (`56c46f6a802d4d449cb3c7bed9f05b69`)
  - `NOTION_QUOTES_DB_ID` — 견적서 DB (`eb9f26a4c70a4d33a1de5f98967ec0dd`)
- **Data flow:** Requests/Schedules/Pricing are read from Notion; Quotes are written to both PostgreSQL and Notion
- **Fallback:** If Notion DBs are not accessible, app falls back to sample data (requests) or PostgreSQL seed (pricing)

### PostgreSQL (via `pg` + Drizzle ORM)
- **Purpose:** Stores quotes, service pricing, and tax pricing data
- **Environment variable:** `DATABASE_URL`
- **Schema location:** `shared/schema.ts`
- **Migration tool:** drizzle-kit with output to `./migrations`

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
