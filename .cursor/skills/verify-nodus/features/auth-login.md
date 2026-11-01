# Authentication - Login

Login enables users to submit their email and password credentials, receive per-field feedback on invalid inputs, review server authentication errors or account suspension notices, and navigate securely into their target workspace.

## Sub-features

- `login-open` opens the login screen from the header or direct navigation.
- `login-validate` verifies that empty fields trigger per-field validation alerts without calling the backend.
- `login-submit-success` submits valid credentials, receives JWT token, stores access token in memory, decodes claims into session state, and redirects to destination.
- `login-submit-failure` displays an error alert banner on invalid credentials (HTTP 401).
- `login-suspended-card` displays an account suspended banner and "Return to catalog" navigation on HTTP 403.
- `login-registration-banner` displays an onboarding success banner when redirected from registration with `registered=true`.
- `login-password-visibility` toggles password input masking between hidden and clear text.
- `login-redirect` sanitizes the `redirect` search parameter and navigates there upon authentication (defaults to `/workspace`).

## How to get to it (user POV)

- Click the `Sign in` link in the application header at `/`.
- Navigate directly to `/login` in the browser.
- Attempt to access a protected URL such as `/workspace` while unauthenticated.

## Driving it with verify-nodus

Preconditions:

- Nodus preview instance is healthy at `http://localhost:4173`.
- User is currently unauthenticated.
- `node .cursor/skills/verify-nodus/scripts/verify.mjs doctor` passes.

- **Open login screen.** Navigate to `/login` or click `getByRole("link", { name: "Sign in" })`. A card appears with heading `Welcome back`.
- **Empty validation.** Click `getByRole("button", { name: "Log in" })` without typing. Alerts appear: `getByText("Email is required.")` and `getByText("Password is required.")`.
- **Invalid credentials.** Fill `getByLabelText("Email")` with `invalid@example.com` and `getByLabelText("Password")` with `wrong-password`. Click `Log in`. An alert banner appears with text `Invalid email or password.`.
- **Suspended account.** Fill `getByLabelText("Email")` with `suspended@nodus.edu` and `getByLabelText("Password")` with any password. Click `Log in`. The card displays `Your account has been suspended by an administrator.` and `getByRole("link", { name: "Return to catalog" })`.
- **Valid submission.** Fill `getByLabelText("Email")` with `student@example.com` and `getByLabelText("Password")` with `password123`. Click `Log in`. The button text temporarily shows `Signing in...`.
- **Redirect navigation.** If initiated with `/login?redirect=/workspace`, the application automatically transitions to `/workspace`.
- **Proof.** Run `node .cursor/skills/verify-nodus/scripts/verify.mjs drive auth-login`. Proof is written to `.cursor/skills/verify-nodus/artifacts/auth-login.log`.

## Gotchas

- Submitting with invalid credentials retains the typed email so the user can correct their input.
- An already-authenticated user visiting `/login` will be redirected back to the home page or target via `requireGuest` guard.
- Open redirect attempts via `redirect=//evil.com` or backslash evasion are sanitized to `/` or `/workspace`.
