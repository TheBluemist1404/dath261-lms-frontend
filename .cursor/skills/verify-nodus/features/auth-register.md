# Authentication - Register

Register enables prospective students and lecturers to create an account, choose their role using an accessible tab toggle, validate inputs against naming and length rules, and redirect cleanly to the login screen with prefilled credentials upon HTTP 201 creation.

## Sub-features

- `register-open` opens the registration screen from direct URL or the login page navigation link.
- `register-role-toggle` switches the account type between `STUDENT` and `LECTURER` using WAI-ARIA tab semantics.
- `register-fullname-partition` enforces full name input with both first and last name segments, rejecting mononyms.
- `register-validate` validates required fields, email format, and password length (8 to 72 characters) inline.
- `register-submit-success` creates an account (HTTP 201) and redirects to `/login?email=...&registered=true` without establishing an unauthenticated zombie session.
- `register-submit-failure` renders an alert banner when the email is already registered (HTTP 409) or rejected by the backend.
- `register-password-visibility` toggles password visibility between masked and clear text.

## How to get to it (user POV)

- Navigate directly to `/register` in the browser.
- Click the `Create an account` link on the `/login` screen card.
- Follow any registration invitation link from landing pages.

## Driving it with verify-nodus

Preconditions:

- Nodus preview instance is healthy at `http://localhost:4173`.
- User is currently unauthenticated.
- `node .cursor/skills/verify-nodus/scripts/verify.mjs doctor` passes.

- **Open register screen.** Navigate to `/register`. A card renders with heading `Create your account`.
- **Role toggle.** Find `getByRole("tab", { name: "Student" })` (active with `aria-selected="true"`). Click `getByRole("tab", { name: "Lecturer" })`. The active tab switches to Lecturer with `aria-selected="true"`.
- **Empty validation.** Click `getByRole("button", { name: "Create account" })` with blank inputs. Alerts appear for full name, email, and password.
- **Mononym validation.** Type `Plato` into `getByLabelText("Full name")`. Submit form. An alert displays `Please enter your full name (both first and last name).`.
- **Duplicate email or error.** Input full name `Jane Doe`, existing email `taken@example.com`, and password `password123`. Click `Create account`. An alert banner displays `An account with this email already exists.`.
- **Valid registration.** Input `Dr. Nguyen`, unique email `lecturer@example.com`, and `lecturer123`. Click `Create account`. The button temporarily displays `Creating account...`. The router redirects to `/login?email=lecturer%40example.com&registered=true` where the green banner `Account created successfully. Please log in.` is shown.
- **Proof.** Run `node .cursor/skills/verify-nodus/scripts/verify.mjs drive auth-register`. Proof is written to `.cursor/skills/verify-nodus/artifacts/auth-register.log`.

## Gotchas

- Role defaults to `STUDENT` on mount.
- Registration does not auto-login the user or issue tokens. The user must explicitly authenticate on `/login` to create a valid session.
- Already authenticated users visiting `/register` are redirected back to the home page or target via `requireGuest`.
- Password minimum length is 8 characters, maximum 72 characters.
