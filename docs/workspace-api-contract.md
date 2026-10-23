# Workspace API contract

Status: proposed on 2026-10-22 by the Workspace owner and implemented by the
backend on `feat/workspace-api` (2026-10-23). The frontend still mocks it in
`src/features/workspace/testing/handlers.ts` for tests and `VITE_API_MOCKING=true`.
Types live in `src/features/workspace/types.ts`. Change all three together.

Product rules come from the Notion Use Cases (UC-08, UC-09) and Authorization
Model. Fields follow the backend Prisma models in `prisma/models/workspace.prisma`.

## Conventions

- All routes are under `/api` and require `Authorization: Bearer <accessToken>`.
- A workspace the caller is not a member of returns `404`, not `403`, so its
  existence is not disclosed.
- Errors use the NestJS default body: `{ statusCode, message, error }`.
- An archived workspace is readable by its members but every write returns `409`
  until an Owner restores it.
- Members are added directly by email. There are no invitations, matching the
  current data model.
- Administrators have no workspaces: every route below returns `403` for an
  `ADMIN` token. A Student or Lecturer's personal workspace is created the first
  time they call `GET /workspaces`.
- Request bodies may be up to 2 MB, since page content is a whole editor document.
- Validation failures, including unknown body fields, return `400`.

## Resources

`Workspace`: `id`, `name`, `type` (`PERSONAL` | `COLLABORATIVE`),
`currentUserRole` (`OWNER` | `CO_OWNER` | `MEMBER`), `pageCount`,
`memberCount`, `archivedAt`, `createdAt`, `updatedAt`.

`PageSummary`: `id`, `workspaceId`, `title`, `parentPageId`, `createdAt`,
`updatedAt`. `Page` adds `content` (the editor document as JSON, or `null`).
Personal pages store BlockNote blocks as `{ type: "blocknote", blocks }`; older
pages may still hold `{ type: "plain-text", text }`, which the editor opens as
one paragraph per line. Shared pages are edited through the collaboration
server below, which keeps `content` as a `{ type: "plain-text", text }` snapshot.

`WorkspaceMember`: `userId`, `role`, `joinedAt`, and
`user { id, email, firstName, lastName }`.

## Endpoints

| Method | Path | Body | Success | Rules |
| --- | --- | --- | --- | --- |
| GET | `/workspaces?archived=true` | | `200 Workspace[]` | Caller's memberships; active by default, archived with the flag. Includes the personal workspace. |
| POST | `/workspaces` | `{ name }` | `201 Workspace` | Creates a `COLLABORATIVE` workspace with the caller as `OWNER`. Name 1 to 100 characters. |
| GET | `/workspaces/:id` | | `200 Workspace` | Members only. |
| PATCH | `/workspaces/:id` | `{ name }` | `200 Workspace` | Owner only. |
| POST | `/workspaces/:id/archive` | | `200 Workspace` | Owner only; not for `PERSONAL`. |
| POST | `/workspaces/:id/restore` | | `200 Workspace` | Owner only. |
| GET | `/workspaces/:id/pages` | | `200 PageSummary[]` | Flat list; the client builds the tree from `parentPageId`. |
| POST | `/workspaces/:id/pages` | `{ title, parentPageId? }` | `201 Page` | Parent must be in the same workspace. Title 1 to 200 characters. |
| GET | `/pages/:id` | | `200 Page` | Members of the page's workspace. |
| PATCH | `/pages/:id` | `{ title?, parentPageId?, content? }` | `200 Page` | Moving under itself or a descendant returns `400`. |
| DELETE | `/pages/:id` | | `204` | Deletes the subtree. |
| GET | `/workspaces/:id/members` | | `200 WorkspaceMember[]` | Members only. |
| POST | `/workspaces/:id/members` | `{ email, role }` | `201 WorkspaceMember` | `role` is `MEMBER` or `CO_OWNER`. Owner adds either; Co-owner adds `MEMBER` only. `PERSONAL` and archived return `409`. Unknown email `404`, an administrator's email `400`, existing member `409`. |
| DELETE | `/workspaces/:id/members/:userId` | | `204` | Owner removes Members and Co-owners; Co-owner removes Members; Owners cannot be removed (`403`). Not a member `404`. Archived `409`. |

## Course references

Rules come from FR-RR-01 to FR-RR-06 and UC-11. Rows follow
`prisma/models/reference.prisma` (`pageId`, `courseBlockId`,
`timestampSeconds`); only `FILE` and `VIDEO` course blocks can be referenced.

A block is accessible when the caller is the course's lecturer or has an
enrollment that is not `LEFT`, and the course is `PUBLISHED` and not
suspended. Access is checked again on every read, so the same reference can
resolve differently for different members of a workspace.

The editor can also place a reference in the page text as a
`{ type: "courseReference", props: { referenceId } }` block. The block holds
only the id; the card is resolved from `GET /pages/:id/references`, so access
is still checked per viewer and no block metadata is stored in page content.

`CourseReference`: `id`, `pageId`, `createdAt`, and `status`:

- `AVAILABLE` adds `block { id, type, title, courseId, courseTitle,
  durationSeconds }` and `timestampSeconds`.
- `LOCKED` (no current enrollment) and `UNAVAILABLE` (course in Draft or
  suspended) add nothing, so no block metadata leaks (NFR-VAL-02).

| Method | Path | Body | Success | Rules |
| --- | --- | --- | --- | --- |
| GET | `/pages/:id/references` | | `200 CourseReference[]` | Members of the page's workspace. |
| POST | `/pages/:id/references` | `{ courseBlockId, timestampSeconds? }` | `201 CourseReference` | Block must be an accessible `FILE` or `VIDEO`, otherwise `404`. `timestampSeconds` only for videos, a whole number from 0 to the video's `content.durationSeconds`, otherwise `400`. Archived workspace `409`. |
| DELETE | `/references/:id` | | `204` | Members of the page's workspace; archived `409`. |
| GET | `/reference-sources?type=FILE\|VIDEO&q=` | | `200 ReferencedBlock[]` | Accessible blocks of that type; `type` is required (`400`). `q` matches block or course title, case-insensitive. |

The frontend links "Open source" to `/courses/:courseId?block=:blockId&t=:seconds`
until the course player route exists.

## Search and recent pages

Both cover pages in the caller's active (not archived) workspaces only
(FR-PW-06). `PageHit`: `page` (a `PageSummary`), `workspace { id, name, type }`,
`path` (ancestor page titles, root first), and `snippet` (text around the first
match in the page content, or `null`).

| Method | Path | Body | Success | Rules |
| --- | --- | --- | --- | --- |
| GET | `/search/pages?q=` | | `200 PageHit[]` | Case-insensitive match on title or content text; `q` shorter than 2 characters returns `400`. Title matches first, then content matches, each newest `updatedAt` first. At most 50 hits. |
| GET | `/recent-pages?limit=` | | `200 PageHit[]` | Newest `updatedAt` first, `limit` a whole number from 1 to 20 (default 5, otherwise `400`), `snippet` is `null`. There is no visit history yet, so "recent" means recently edited. Kept off `/pages/*` so it cannot collide with `/pages/:id`. |

Content text is every string `text` field in the editor JSON, which covers
BlockNote blocks and the plain-text snapshots of shared pages.

## Page discussion and reports

For FR-CW-13 and FR-AD-02, on the backend's `Message` and `Report` models
(`src/modules/discussion`). The REST endpoints are the source of history; new
messages are also pushed live (see Real-time collaboration below).

`PageMessage`: `id`, `pageId`, `sender { id, firstName, lastName }`, `content`,
`createdAt`. Messages belong to the page; a passage the user selected in the
editor is passed to the discussion screen as `?passage=` for context only.

| Method | Path | Body | Success | Rules |
| --- | --- | --- | --- | --- |
| GET | `/pages/:id/messages` | | `200 PageMessage[]` | Members of the page's workspace, oldest first. `PERSONAL` returns `409`. |
| POST | `/pages/:id/messages` | `{ content }` | `201 PageMessage` | 1 to 2000 characters after trimming. `PERSONAL` or archived returns `409`. |
| POST | `/reports` | `{ targetType: "MESSAGE", targetId, reason, description? }` | `201 { id, status }` | Reporter must be able to see the message (`404` otherwise); reporting your own message returns `400`. `status` starts `PENDING`. |

## Real-time collaboration

Pages in `COLLABORATIVE` workspaces are edited live through a Yjs WebSocket
server (Hocuspocus) at `ws(s)://<api host>/api/collab`. The Vite dev server
proxies it with the rest of `/api`; `VITE_COLLAB_URL` overrides the address.

- The document name is the page id. The editor binds to the Yjs XML fragment
  `document-store` (BlockNote's structure through y-prosemirror).
- The client sends the REST access token. The server checks it, the account
  status, and membership of the page's workspace; archived workspaces are
  served read-only (`authenticated` scope `readonly`).
- On first open the server seeds the shared state from the page's stored
  `content` and saves it, so every client starts from the same history.
  Edits are stored as the Yjs state (`pages.yjs_state`) at most 2 to 10 seconds
  after they arrive, together with the plain-text `content` snapshot for search.
- Refusals and server closes carry a reason: `token-invalid` (refresh the
  token and reconnect), `not-found`, `not-collaborative`, `access-revoked`
  (member removed) and `page-deleted` (access ended), and `workspace-changed`
  (archived or restored: reconnect to get the new scope).
- Discussion updates use the same server: a client subscribes to the document
  `discussion:<pageId>` (same membership rules, always read-only, nothing
  stored) and receives `{ "type": "message.created", "message": PageMessage }`
  as a stateless message for every post, its own included, so clients
  de-duplicate by `id`.
- Presence uses Yjs awareness: each client publishes
  `user { id, name, color }`, which also labels its cursor.
- Personal pages do not use this server; they save `content` through
  `PATCH /pages/:id`.

## Not yet covered

Page archive/restore (no field in the model) and copying permitted course
material (FR-RR-07/08, no model yet) get their own sections when those phases
start.

## Frontend auth against the current backend

The backend's `POST /auth/login` and `POST /auth/refresh` return
`{ accessToken }` and set the refresh token as an HttpOnly cookie scoped to
`/api/auth`. The frontend keeps the access token in memory, sends it as a
Bearer header, refreshes once on a `401`, and restores the session on load by
calling refresh. There is no current-user endpoint, so the user id and role
come from the token's `sub` and `role` claims. The Vite dev server proxies
`/api` to `VITE_API_PROXY_TARGET` (default `http://localhost:3001`) so the
SameSite=Strict cookie stays same-site. Set `VITE_API_MOCKING=true` to serve
the API from MSW instead. In production, `vercel.json` rewrites `/api/*` to the
Render backend for the same reason, and every other path to `index.html` for
client-side routes.

To try the UI against the real backend, run the backend with a database and
`pnpm db:seed:dev` there (it prints the seeded accounts), then start the
frontend with `VITE_API_MOCKING=false`. There is no sign-in screen yet; sign in
by calling `POST /api/auth/login` from the browser console on
`http://localhost:3000`, then reload.
