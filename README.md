# Learner-Oriented LMS — Frontend

[![CI](https://github.com/TheBluemist1404/dath261-lms-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/TheBluemist1404/dath261-lms-frontend/actions/workflows/ci.yml)

Frontend application for the **DATH 261 Learner-Oriented Learning Management System**.

The project combines conventional LMS workflows with a personal knowledge workspace so that learning material, student notes, contextual references, collaboration, assessments, and progress can live in one permission-aware learning environment.

## Product Direction

The core learning loop is:

> **Enroll → learn from official material → construct personal knowledge → collaborate → complete assessments → review progress**

The frontend is designed around three main roles:

- **Students** — enroll, learn, take contextual notes, collaborate, submit work, and track progress.
- **Instructors** — publish course content, manage assessments, grade submissions, and participate in invited study spaces.
- **Administrators** — manage platform access, courses, moderation, and basic operational statistics.

## Planned MVP

The current repository is the frontend foundation. Product functionality will be implemented incrementally through tracked issues and pull requests.

- Authentication, profile management, and role-aware navigation.
- Course catalog, enrollment, modules, lessons, and learning resources.
- Lesson completion, assessments, submissions, grading, and progress tracking.
- Personal workspace with nested pages and a study-oriented rich-text editor.
- Permission-aware references from personal notes to canonical course resources.
- Shared course study spaces with collaborative editing, presence, and contextual discussion.
- Dashboard, deadlines/calendar, and in-app notifications.
- Instructor course/content management.
- Administrator user/course management and moderation.

The MVP intentionally excludes a full Notion clone, arbitrary databases, public page publishing, full offline mode, native video-conferencing infrastructure, AI generation, and multi-organization tenancy.

## Frontend Architecture

This repository contains the React web client. It communicates with the NestJS backend over REST and, for collaborative study features, an authenticated real-time channel.

```text
React + TanStack Router
        │
        ├── REST ──────────────> NestJS API
        │                         Auth / RBAC / LMS domains
        │
        └── WebSocket / Yjs ───> Collaboration service
                                  Shared documents / presence
```

The source tree follows a feature-first structure:

```text
src/
├── main.tsx
├── router.tsx
├── router-context.ts
├── routeTree.gen.ts
│
├── routes/                 # route params, guards, loaders, redirects, layouts
├── features/               # feature-owned UI, hooks, API, queries, and types
├── components/
│   └── ui/                 # reusable domain-agnostic UI
├── lib/
│   ├── http/               # Axios infrastructure
│   └── query/              # TanStack Query infrastructure
└── test/
    ├── setup.ts
    ├── render.tsx
    └── mocks/              # MSW handlers/server
```

Keep route files thin. Business behavior belongs to the corresponding feature rather than accumulating inside `routes/`.

## Technology

### Current foundation

- React 19
- TypeScript
- Vite 8
- TanStack Router
- TanStack Query
- Axios
- Tailwind CSS 4
- Biome
- Vitest + React Testing Library
- MSW
- Husky + lint-staged + commitlint
- pnpm
- GitHub Actions

### Planned application-level additions

- **Lexical** for the study-oriented rich-text editor.
- **Yjs** for CRDT-based collaborative documents and presence.
- **Playwright** for end-to-end coverage once complete user flows exist.

Application-specific dependencies are added when their feature is implemented rather than being preinstalled without use.

## Getting Started

### Requirements

- Node.js **22.12+**
- pnpm **12** (the repository pins the expected version through `packageManager`)

Enable Corepack if pnpm is not already available:

```bash
corepack enable
```

Install dependencies:

```bash
pnpm install
```

Create your local environment file:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

Start the development server:

```bash
pnpm dev
```

The application runs at **http://localhost:3000** by default.

### Environment Variables

```env
VITE_API_BASE_URL=/api
```

Do not commit secrets or local `.env` files.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Create a production build |
| `pnpm preview` | Preview the production build |
| `pnpm typecheck` | Run TypeScript without emitting files |
| `pnpm test` | Run Vitest once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Format with Biome |
| `pnpm check` | Check formatting, lint rules, and imports |
| `pnpm check:fix` | Apply Biome fixes |
| `pnpm ci` | Run the full local CI-equivalent quality gate |

## Testing and Quality Gates

Tests should normally live beside the source they verify.

- **Vitest + React Testing Library** — utilities, hooks, components, and feature/integration behavior.
- **MSW** — API-facing tests at the HTTP boundary instead of mocking Axios internals.
- **Playwright** — later, for critical whole-application flows such as enrollment, learning, note creation, and collaboration.

Every pull request is checked by GitHub Actions with a frozen pnpm install, Biome, TypeScript, Vitest, and a production Vite build.

Local Git hooks provide earlier feedback:

- `pre-commit` runs Biome on staged files and performs a full typecheck.
- `commit-msg` enforces Conventional Commits.

## Contributing

Coursework contributions must remain individually traceable. Non-trivial work should start from a GitHub issue and land through a focused pull request with relevant tests/evidence.

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions, testing expectations, and the review workflow.

A typical contribution looks like:

```text
Issue #42
   ↓
feat/42-course-enrollment
   ↓
meaningful conventional commits
   ↓
Pull Request (Closes #42)
   ↓
CI + review
   ↓
main
```

## Project Principles

- Personal notes remain student-owned.
- Course resources remain instructor/platform-owned and access-controlled.
- Referencing course content never duplicates or transfers ownership of the canonical resource.
- Authorization must be enforced by the backend on protected resources and real-time connections; frontend checks are UX, not security boundaries.
- Prefer small, reviewable vertical changes over large late integrations.
