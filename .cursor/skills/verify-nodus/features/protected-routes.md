# Protected Routes & Layouts

Protected routes ensure unauthenticated visitors cannot access private areas like student workspaces or administrator tools, redirecting guests to the login screen with a sanitized return destination, while granting access to users with verified credentials and roles.

## Sub-features

- `guard-unauthenticated-bounce` intercepts guest navigation to protected paths (`/workspace`) and redirects to `/login?redirect=<target>`.
- `guard-sanitize-redirect` strips external open-redirect domains, backslashes, and abnormal protocols, falling back safely to `/workspace` or `/`.
- `guard-authenticated-pass` permits users with active sessions into authenticated layout routes (`_layout/workspace`).
- `guard-role-enforcement` restricts role-specific layout routes (`_layout/admin`) to users possessing required privileges.
- `guard-reverse-redirect` prevents authenticated users from re-entering `/login` or `/register` via `requireGuest`.

## How to get to it (user POV)

- Enter a URL directly into the browser address bar for a protected route, such as `http://localhost:4173/workspace`.
- Click on an internal link or bookmark leading to an authenticated page while signed out.
- Attempt to navigate to `/login` or `/register` when already signed into an active session.

## Driving it with verify-nodus

Preconditions:

- Nodus preview instance is healthy at `http://localhost:4173`.
- `node .cursor/skills/verify-nodus/scripts/verify.mjs doctor` passes.

- **Guest access bounce.** As an unauthenticated visitor, navigate to `/workspace`. Router intercepts the request and navigates to `/login?redirect=%2Fworkspace`.
- **Malicious redirect attempt.** As an unauthenticated visitor, open `/login?redirect=https%3A%2F%2Fevil.com` or `/login?redirect=%2F%2Fevil.com`. After login, the user lands at `/workspace` rather than the external domain.
- **Protocol evasion attempt.** Navigate to `/login?redirect=javascript%3Aalert(1)`. Redirect resolver sanitizes the value and falls back safely to `/workspace`.
- **Authorized entry.** Authenticate as a student. Navigate to `/workspace`. Route loader resolves successfully and renders the study workspace.
- **Proof.** Run `node .cursor/skills/verify-nodus/scripts/verify.mjs drive protected-routes`. Proof is written to `.cursor/skills/verify-nodus/artifacts/protected-routes.log`.

## Gotchas

- TanStack Router executes `beforeLoad` guards before rendering route components; an unauthenticated or loading state triggers an immediate throw redirect.
- The default protected study workspace route is `/workspace` (there is no `/dashboard` route).
- Sanitization normalizes backslashes (`\`) and double slashes (`//`) to prevent browser URL parser confusion.
- Query client cache and session tokens are invalidated on sign-out so stale protected data is never shown.
