# Design Specification: Neon PostgreSQL Database Integration with Prisma ORM

- **Project:** ThinkDirect (DevFest 2026 MVP)
- **Author:** Antigravity & User Pair
- **Date:** 2026-11-07
- **Status:** Approved / In Review
- **File:** `docs/superpowers/specs/2026-11-07-neon-db-setup-design.md`

---

## 1. Overview & Motivation

ThinkDirect is an AI-powered English speaking and direct-thinking practice platform built with Express, React 19, TypeScript, and Google Gemini. Currently, the application operates with in-memory state and mock defaults without a persistent database layer.

This specification details the end-to-end integration of **Neon Serverless PostgreSQL** using **Prisma ORM**. The system will support persistent storage for users, practice sessions, coach feedback, and speech transcripts while maintaining resilience, low latency, and zero connection exhaustion during local development hot-reloads and production deployment.

---

## 2. Architecture & Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Backend                        │
│                                                             │
│   ┌────────────────────┐         ┌──────────────────────┐   │
│   │ /api/health/db     │         │ /api/sessions, etc.  │   │
│   └─────────┬──────────┘         └──────────┬───────────┘   │
│             │                               │               │
│             ▼                               ▼               │
│      ┌───────────────────────────────────────────────┐      │
│      │        server/db/prisma.ts (Singleton)        │      │
│      │  (Global instance to prevent connection leaks)│      │
│      └──────────────────────┬────────────────────────┘      │
└─────────────────────────────┼───────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       [Query Operations]          [Migrations / Push]
      DATABASE_URL (Pooled)        DIRECT_URL (Unpooled)
               │                             │
               ▼                             ▼
   ┌─────────────────────────────────────────────────────────┐
   │                  Neon Cloud PostgreSQL                  │
   │               (Serverless PgBouncer Pool)               │
   └─────────────────────────────────────────────────────────┘
```

### 2.1 Dependencies
- **Runtime (`dependencies`):**
  - `@prisma/client`: Core query engine client for Node.js.
- **Build & Development (`devDependencies`):**
  - `prisma`: CLI tool for schema management, migrations, DB pushing, and Prisma Studio UI.

### 2.2 File Layout
```
thinkdirect/
├── prisma/
│   └── schema.prisma              # Prisma schema definition (datasource, generator, models)
├── server/
│   ├── config/
│   │   └── env.ts                 # Database environment variables & validation
│   ├── db/
│   │   └── prisma.ts              # Global singleton PrismaClient instance
│   ├── routes/
│   │   ├── dbHealthRoutes.ts      # Dedicated DB connectivity check route (/api/health/db)
│   │   └── index.ts               # Router aggregator mounting dbHealthRoutes
├── .env.example                   # Updated with DATABASE_URL & DIRECT_URL examples
└── .env.local                     # Local environment file with actual credentials
```

---

## 3. Data Models & Schema Design (`prisma/schema.prisma`)

### 3.1 Datasource & Generator Configuration
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### 3.2 Core Entity Models

#### 1. `User`
Stores learner profiles, proficiency levels, and streak tracking.
- `id`: `String` (UUID / cuid, primary key)
- `email`: `String?` (Unique, optional for anonymous/guest sessions)
- `name`: `String?`
- `level`: `String` (Default `'B1'`, matches `A2` | `B1` | `B2` | `Not sure`)
- `hardestPart`: `String?` (User's primary obstacle in spoken English)
- `streakDays`: `Int` (Default `0`)
- `createdAt`: `DateTime` (Default `now()`)
- `updatedAt`: `DateTime` (Updated automatically `@updatedAt`)
- Relations: `sessions PracticeSession[]`

#### 2. `PracticeSession`
Records individual practice attempts, topics, stages, and metrics.
- `id`: `String` (UUID / cuid, primary key)
- `userId`: `String?` (Foreign key to `User.id`, nullable for guest sessions)
- `contextKey`: `String` (e.g., `'STUDY_WORKSPACE'`, `'MORNING_COFFEE'`, `'PLANNING_DAY'`)
- `topicLabel`: `String`
- `mode`: `String` (Default `'real'`, values: `'real'` | `'demo'`)
- `inputMode`: `String` (Default `'microphone'`, values: `'microphone'` | `'typing'`)
- `totalDurationSeconds`: `Int` (Default `0`)
- `completed`: `Boolean` (Default `false`)
- `createdAt`: `DateTime` (Default `now()`)
- `updatedAt`: `DateTime` (`@updatedAt`)
- Relations:
  - `user`: `User?`
  - `feedback`: `SessionFeedback?`
  - `transcripts`: `SpeechTranscript[]`

#### 3. `SessionFeedback`
AI Coach qualitative evaluation and pedagogical recommendations.
- `id`: `String` (UUID / cuid, primary key)
- `sessionId`: `String` (Unique foreign key to `PracticeSession.id`)
- `speakingStrength`: `String` (Identified user strengths)
- `actionableImprovement`: `String` (Clear, single-focus area to improve)
- `nextPracticeSuggestion`: `String` (Suggested next scene or exercise)
- `fluencyScore`: `Int?` (0-100 rating)
- `thinkingScore`: `Int?` (0-100 rating)
- `rawCoachOutput`: `Json?` (Full JSON payload from Gemini Coach model)
- `createdAt`: `DateTime` (Default `now()`)
- Relations:
  - `session`: `PracticeSession`

#### 4. `SpeechTranscript`
Granular transcriptions and STT SLA latency tracking for each speaking stage.
- `id`: `String` (UUID / cuid, primary key)
- `sessionId`: `String` (Foreign key to `PracticeSession.id`)
- `stageKey`: `String` (e.g., `'EXPANSION'`, `'IDEA_DEVELOPMENT'`, `'GUIDED_SELF_TALK'`)
- `audioDurationMs`: `Int?`
- `latencyMs`: `Int?` (SLA measurement for STT)
- `userTranscript`: `String`
- `modelFeedback`: `String?`
- `createdAt`: `DateTime` (Default `now()`)
- Relations:
  - `session`: `PracticeSession`

---

## 4. Connection Resilience & Singleton Architecture

### 4.1 Development Hot-Reload Safety
In Node.js with `tsx watch` or Vite middleware, re-running server scripts can instantiate multiple `PrismaClient` objects, rapidly depleting Neon's connection pool.

Implementation in `server/db/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export async function checkDatabaseConnection(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: Date.now() - start, error: message };
  }
}
```

### 4.2 Fallback for `DIRECT_URL`
If only `DATABASE_URL` is set in `.env.local` without a distinct `DIRECT_URL`, the application config in `server/config/env.ts` will ensure `DIRECT_URL` falls back to `DATABASE_URL`, preventing Prisma CLI schema errors.

---

## 5. Health Check & Diagnostics API

A new API route `GET /api/health/db` will be provided:
- **Success (200 OK):**
  ```json
  {
    "status": "healthy",
    "database": "neon-postgresql",
    "latencyMs": 42,
    "timestamp": "2026-11-07T08:15:00.000Z"
  }
  ```
- **Failure (503 Service Unavailable):**
  ```json
  {
    "status": "unhealthy",
    "database": "neon-postgresql",
    "error": "Connection timed out or invalid credentials",
    "latencyMs": 1502,
    "timestamp": "2026-11-07T08:15:00.000Z"
  }
  ```

---

## 6. Developer Workflow Scripts (`package.json`)

New npm scripts:
- `npm run db:generate`: Regenerate Prisma Client types after schema modifications (`prisma generate`).
- `npm run db:push`: Synchronize schema directly to Neon without creating migration files (`prisma db push`). Ideal for rapid development and hackathons.
- `npm run db:migrate`: Create and execute SQL migration files (`prisma migrate dev`).
- `npm run db:studio`: Launch Prisma Studio on `http://localhost:5555` to view and edit database rows visually.

---

## 7. Testing & Verification Plan

1. **Dependency Installation Check:** Verify `prisma` and `@prisma/client` install without dependency conflicts.
2. **Schema Validation:** Run `npx prisma validate` to guarantee syntax correctness.
3. **Client Generation:** Run `npx prisma generate` to verify TypeScript types output to `node_modules/@prisma/client`.
4. **Environment Check:** Check that `.env.example` has documented `DATABASE_URL` and `DIRECT_URL`.
5. **Connectivity & Push Test:**
   - Execute `npx prisma db push` once the user inputs their `DATABASE_URL` in `.env.local`.
   - Call `GET http://localhost:3000/api/health/db` to verify live ping and latency to Neon.
6. **CRUD Sanity Test:** Run a lightweight integration test verifying writing and querying a test session record in Neon.
