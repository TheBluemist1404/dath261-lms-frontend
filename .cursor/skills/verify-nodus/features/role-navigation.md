# Role-Aware Navigation & Header

Role-aware navigation adapts header controls and sidebar navigation items according to whether the user is a guest, student, lecturer, or administrator, and handles complete frontend session teardown upon sign-out.

## Sub-features

- `header-guest-state` shows the brand logo and `Sign in` link when unauthenticated.
- `header-loading-state` suppresses guest UI flicker while session resolution is in flight by rendering null.
- `header-authenticated-state` shows user avatar initials badge and a `Sign out` button when signed in.
- `header-sign-out` terminates the session via `terminateSession()`, clears in-memory tokens, sets the logout tombstone, purges TanStack Query cache, and resets UI to guest state.
- `sidebar-role-filtering` presents role-appropriate menu groups and hides unauthorized links.

## How to get to it (user POV)

- View the top navigation header on any page across the application.
- Observe the left sidebar navigation when logged in as different roles.
- Click the `Sign out` button in the header while authenticated.

## Driving it with verify-nodus

Preconditions:

- Nodus preview instance is healthy at `http://localhost:4173`.
- `node .cursor/skills/verify-nodus/scripts/verify.mjs doctor` passes.

- **Guest header.** View header in unauthenticated state. `getByRole("link", { name: "Sign in" })` is rendered with `href="/login"`. No sign-out button is present.
- **Authenticated student.** Log in or hydrate store with `role: "student"`, name `Student User`. Header displays user initials badge and `getByRole("button", { name: "Sign out" })`. Sidebar displays `Dashboard`, `My Courses`, `Catalog`, `Workspaces`, `Calendar`, `Notifications`.
- **Authenticated lecturer.** Log in or hydrate store with `role: "lecturer"`. Sidebar displays `My Courses`, `Workspaces`, `Calendar`, `Notifications`, hiding student-only `Dashboard` and `Catalog`.
- **Authenticated admin.** Navigating to `/admin` renders admin routes. Admin navigation displays `Overview`, `Users`, `Courses`, and `Reports` (with unrouted items marked `aria-disabled="true"`).
- **Sign-out action.** Click `getByRole("button", { name: "Sign out" })`. Auth store resets to unauthenticated. The session tombstone is placed. TanStack Query cache is purged. The header immediately returns to guest state displaying `Sign in`.
- **Proof.** Run `node .cursor/skills/verify-nodus/scripts/verify.mjs drive role-navigation`. Proof is written to `.cursor/skills/verify-nodus/artifacts/role-navigation.log`.

## Gotchas

- Header sign-out triggers `terminateSession()` which broadcasts a logout event across browser tabs.
- Header renders `null` during `status === "loading"` to prevent flash of guest state during initial session bootstrap.
- Router invalidation occurs immediately after logout to bounce the user out of protected views.
