---
name: verify-nodus
description: "Verify and drive Nodus LMS frontend behavior across user registration, login, session persistence, role navigation, and route guards. Use for /verify-nodus, verifying authentication UX, reproducing route issues, or capturing proof artifacts."
---

# Verify Nodus LMS Frontend

Drive and verify user-facing behavior in Nodus LMS (`dath261-lms-frontend`). This skill launches the production preview or development server, executes deterministic user flows, and captures auditable proof artifacts.

## Launch

Start the preview server for static production-grade verification on port 4173:

```bash
node .cursor/skills/verify-nodus/scripts/verify.mjs launch
```

Alternative direct launch:

```bash
pnpm build
npx vite preview --port 4173
```

**Ready indicator:** The server is ready when `http://localhost:4173/` returns status code `200` with an HTML body containing `<div id="app"></div>`.

**Teardown:** Run `node .cursor/skills/verify-nodus/scripts/verify.mjs cleanup` to terminate the spawned instance recorded in `.run.pid`.

## Doctor

Perform a read-only health check before driving the application:

```bash
node .cursor/skills/verify-nodus/scripts/verify.mjs doctor
```

The doctor command inspects:
- Node.js version compatibility (`>= 22.12.0`).
- Integrity of production build assets at `dist/index.html`.
- Port 4173 availability and HTTP response status.
- Writes a diagnostic report to `.cursor/skills/verify-nodus/artifacts/doctor.json`.

If `distExists` is false, run `pnpm build` before driving.

## Drive

Exercise real user flows using the verification runner or targeted test recipes:

```bash
# Drive single feature
node .cursor/skills/verify-nodus/scripts/verify.mjs drive auth-login
node .cursor/skills/verify-nodus/scripts/verify.mjs drive auth-register
node .cursor/skills/verify-nodus/scripts/verify.mjs drive protected-routes
node .cursor/skills/verify-nodus/scripts/verify.mjs drive role-navigation
```

### Stable UI Handles

When asserting or interacting with DOM elements, use these verified accessible selectors:

- **Login Screen (`/login`):**
  - Email field: `getByLabelText("Email")`
  - Password field: `getByLabelText("Password")`
  - Submit: `getByRole("button", { name: "Log in" })`
  - Register link: `getByRole("link", { name: "Create an account" })`
  - Error banner: `getByRole("alert")`
  - Suspended return: `getByRole("link", { name: "Return to catalog" })`
- **Register Screen (`/register`):**
  - Full name field: `getByLabelText("Full name")`
  - Email field: `getByLabelText("Email")`
  - Password field: `getByLabelText("Password")`
  - Role toggle: `getByRole("tab", { name: "Student" })` and `getByRole("tab", { name: "Lecturer" })`
  - Submit: `getByRole("button", { name: "Create account" })`
  - Sign in link: `getByRole("link", { name: "Already have an account? Log in" })`
- **Header Layout:**
  - Brand logo: `getByRole("link", { name: "Nodus home" })`
  - Guest sign-in: `getByRole("link", { name: "Sign in" })` (href `/login`)
  - Authenticated sign-out: `getByRole("button", { name: "Sign out" })`
  - User profile link: `getByLabelText(/profile for/i)`
- **Sidebar Navigation:**
  - Role items: `getByRole("navigation", { name: "Primary navigation" })`
  - Student: `Dashboard`, `My Courses`, `Catalog`, `Workspaces`, `Calendar`, `Notifications`
  - Lecturer: `My Courses`, `Workspaces`, `Calendar`, `Notifications`
  - Admin: `Overview`, `Users`, `Courses`, `Reports`

## Evidence

Every verification drive stores proof artifacts in `.cursor/skills/verify-nodus/artifacts/`:

- `doctor.json`: Environmental diagnostic snapshot.
- `login-shell.html`: Static HTML output served from preview server.
- `auth-login.log`: Terminal output proving successful credentials, invalid password alerts, and redirect navigation.
- `auth-register.log`: Terminal output proving role selection, validation checks, and store hydration.
- `protected-routes.log`: Integration proof demonstrating guest bounces from `/workspace` to `/login?redirect=...`.
- `role-navigation.log`: Proof of header sign-in link, authenticated initials, and sign-out clearing.

Proof standards require:
- Direct execution of user actions and assertions against rendered state.
- Verification of side effects (store clearing, cache invalidation, redirection).
- Retention of proof artifacts after process teardown.

## Cleanup

Shut down spawned background processes safely:

```bash
node .cursor/skills/verify-nodus/scripts/verify.mjs cleanup
```

Cleanup kills only the process tracked by the runner's `.run.pid` file without terminating unrelated tools or browsers. Evidence files in `artifacts/` are permanently preserved for auditing.

## Helpers

All actions are orchestrated via the single runner script:

```bash
# Health check
node .cursor/skills/verify-nodus/scripts/verify.mjs doctor

# Launch preview server
node .cursor/skills/verify-nodus/scripts/verify.mjs launch

# Drive specific feature
node .cursor/skills/verify-nodus/scripts/verify.mjs drive <feature-name>

# Teardown server
node .cursor/skills/verify-nodus/scripts/verify.mjs cleanup
```
