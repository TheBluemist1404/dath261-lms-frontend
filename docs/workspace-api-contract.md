# Workspace API contract

Status: proposed on 2026-10-22 by the Workspace owner; the frontend mocks it in
`src/features/workspace/testing/handlers.ts` until the backend implements it.
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

## Resources

`Workspace`: `id`, `name`, `type` (`PERSONAL` | `COLLABORATIVE`),
`currentUserRole` (`OWNER` | `CO_OWNER` | `MEMBER`), `pageCount`,
`memberCount`, `archivedAt`, `createdAt`, `updatedAt`.

`PageSummary`: `id`, `workspaceId`, `title`, `parentPageId`, `createdAt`,
`updatedAt`. `Page` adds `content` (the editor document as JSON, or `null`).

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
| POST | `/workspaces/:id/members` | `{ email, role }` | `201 WorkspaceMember` | `role` is `MEMBER` or `CO_OWNER`. Owner adds either; Co-owner adds `MEMBER` only. `PERSONAL` returns `409`. Unknown email `404`, existing member `409`. |
| DELETE | `/workspaces/:id/members/:userId` | | `204` | Owner removes Members and Co-owners; Co-owner removes Members; Owners cannot be removed (`403`). |

## Not yet covered

Page archive/restore (no field in the model), search, recent pages, course
references, and real-time collaboration get their own sections when those
phases start.

## Frontend auth against the current backend

The backend's `POST /auth/login` and `POST /auth/refresh` return
`{ accessToken }` and set the refresh token as an HttpOnly cookie scoped to
`/api/auth`. The frontend keeps the access token in memory, sends it as a
Bearer header, refreshes once on a `401`, and restores the session on load by
calling refresh. There is no current-user endpoint, so the user id and role
come from the token's `sub` and `role` claims. The Vite dev server proxies
`/api` to `VITE_API_PROXY_TARGET` (default `http://localhost:3001`) so the
SameSite=Strict cookie stays same-site. Set `VITE_API_MOCKING=true` to serve
the API from MSW instead.
