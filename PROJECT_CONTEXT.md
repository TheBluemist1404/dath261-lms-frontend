# Nodus project context

This is an agent/team handoff, updated on 2026-10-06. Notion owns the product and domain model; Figma owns the UI specification. Verify the relevant live source before implementation. This file records where to look and recent implementation decisions, rather than replacing those sources.

## Project and repositories

Nodus is the DATH 261 Learner-Oriented LMS: course discovery and learning combined with contextual notes and collaborative knowledge workspaces. Older sources use Learner LMS or DATN; these refer to the same project. Commercial marketplace features are outside the MVP.

- [Frontend](https://github.com/TheBluemist1404/dath261-lms-frontend): React web client.
- [Backend](https://github.com/TheBluemist1404/dath261-lms-backend): NestJS API and planned collaboration infrastructure.

## Canonical source map

| Concern | Source |
| --- | --- |
| Project overview | [Notion project hub](https://www.notion.so/3d1eb649baec804d9f59cb15838fcf77) |
| Product requirements | [Requirements Engineering](https://www.notion.so/3e2eb649baec81f9bbf6ed37cf3a8314) |
| Acceptance criteria | [Use Cases](https://www.notion.so/3e2eb649baec81119818cc867b18ce11) |
| Domain structure | [Domain Model](https://www.notion.so/3e2eb649baec810c8d2ffe6329d8ff59) |
| Persistence design | [Data Model & ERD](https://www.notion.so/3e2eb649baec810eb4afcb8585c257f0) |
| Permissions | [Authorization Model](https://www.notion.so/3e2eb649baec814ab314e8ff675e0655) |
| UI screens, states, components | [Figma design](https://www.figma.com/design/ZoyZvigjte06avd3hQ0K7K/Learner-oritented-LMS?node-id=0-1) |
| Workspace UI | [Knowledge Workspaces page](https://www.figma.com/design/ZoyZvigjte06avd3hQ0K7K/Learner-oritented-LMS?node-id=7-6) |

Figma workspace references include the populated list at node `21:91`, personal-only state at `21:7`, and create dialog at `30:13413`. Inspect the relevant frame and alternate states; the file contains more than one screen. If access is unavailable, state that limitation instead of claiming a design comparison. Design prototypes simulate behavior; they do not prove API, persistence, or authorization implementation.

## Recent workspace decisions

These are the latest user-approved clarifications from 2026-10-06; reconcile older source wording before implementing conflicting behavior.

- Student/Lecturer workspace users have a default personal workspace that remains private and has no collaborators. They may create additional workspaces and optionally add collaborators. Additional workspaces can also be used alone; this is about collaboration, not public publishing or a private/public workspace taxonomy.
- Administrators have no workspace workflow in the current product direction. Generic recovery links return home. Older Notion statements granting every User a default workspace need reconciliation with this clarification before backend provisioning is implemented.
- The approved landing-page adaptation shows recently used pages alongside the personal workspace, actual additional-workspace cards, and a Create button on the same line as the section title. Avoid redundant introductory panels.

For membership roles, invitation acceptance, nested pages, live references, and collaboration recovery, consult the Domain, Authorization, and Use Case sources above. Workspace membership does not grant access to referenced course resources; backend authorization remains authoritative.

## Team boundaries

| Owner | Area |
| --- | --- |
| Vũ Lê Hoàng | Workspace/pages/editor/references; architecture and integration |
| Hồ Phương Duy | Backend identity/auth, authorization, database/shared infrastructure |
| Trần Quốc Bảo | Backend courses/CourseBlock, assessments, lecturer rules |
| Lương Thế Hoàng | Student frontend and initial authentication UI |
| Võ Hoàng Phúc Duy | Lecturer frontend |
| Lê Huy Hoàng | Administration frontend |

Feature owners own their tests. Agree API contracts across the repos; do not take over a teammate's domain as incidental scaffolding.

## Frontend implementation context

- React 19, TypeScript, Vite 8, TanStack Router/Query, Zustand, Axios, Tailwind 4, Biome, and Vitest/RTL/MSW. Keep routes thin and feature behavior under `src/features/`; reusable UI belongs under `src/components/ui/`.
- TanStack file routes use the `~` prefix. `src/routeTree.gen.ts` is generated. Run matching TanStack guidance from `AGENTS.md` before relevant code edits.
- The shell composes `Header`, `Sidebar`, and `Outlet`. Reuse the existing brand, icons, Manrope/Inter fonts, and teal tokens. Figma's section background is canvas organization, not an application surface.
- Workspace landing routes live under `src/routes/~_layout/~workspace.tsx`; that parent is the intended future `beforeLoad` auth boundary. Authentication is assumed for this feature, not implemented by a fabricated signed-in user.
- The auth store holds in-memory identity/status only. Session bootstrap and backend session integration remain pending.
- The landing page uses explicit preview data and in-memory creation, not a backend workspace API. `/workspace?preview=empty` previews no additional workspaces. `/workspace/me` and `/workspace/$id` remain editor scaffolds; recent-page hashes are navigation placeholders.
- A global Not Found page returns home. Development Devtools use a fixed bottom-right launcher and repair old saved floating coordinates.
- The page editor is BlockNote (`src/features/workspace/editor/`), chosen over Lexical after the collaboration spike. Shared pages sync through Yjs and the backend's Hocuspocus server at `/api/collab` (`collaboration/hocuspocus-adapter.ts`); personal pages autosave BlockNote JSON over REST. Course references can also sit in the page text: the slash menu's "Course reference" item opens the picker and places a `courseReference` block (`editor/course-reference-block.tsx`) that stores only the reference id and resolves the card per viewer from the page's references. Tests swap the editor for a textarea double (`testing/block-editor-double.tsx`). Playwright tests in `e2e/` cover the real editor (autosave, inline references, archive) against the mocked API.

## Development and checks

Frontend runs at `http://localhost:3000`; backend defaults to `http://localhost:3001`, with REST at `/api`, health at `/health`, and Swagger at `/docs`. The frontend defaults to `VITE_API_BASE_URL=/api`; the current Vite config does not yet provide an API proxy.

Use `pnpm run ci` for the package quality script. With pnpm 12, bare `pnpm ci` is the clean-install command. On PowerShell, use `pnpm.cmd`/`npx.cmd` if script execution policy blocks their `.ps1` shims. Follow repository hooks, Conventional Commits, and attribution rules; keep current state and future plans distinct when updating this handoff.
