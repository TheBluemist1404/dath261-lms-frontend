# Nodus verification map

This directory is the maintained source for verifying user-facing behavior in Nodus LMS (`dath261-lms-frontend`). Read this index before driving the app, then execute the matching feature file recipe.

## Baseline preconditions

- Ensure Node.js `>= 22.12.0` is active.
- Run `pnpm build` so that `dist/index.html` exists.
- Launch the preview instance at `http://localhost:4173` via `node .cursor/skills/verify-nodus/scripts/verify.mjs launch`.
- Run `node .cursor/skills/verify-nodus/scripts/verify.mjs doctor` to confirm process liveness and build freshness.
- Never drive an instance not controlled by this verification run.

## Driving conventions

- Prefer ARIA roles, accessible names, and label text over DOM coordinates or internal selectors.
- Start each recipe from the baseline state specified in its preconditions.
- Run UI drives through the verification runner `node .cursor/skills/verify-nodus/scripts/verify.mjs drive <feature>`.
- Restore any modified store fixtures after execution.
- Proof artifacts survive cleanup in `.cursor/skills/verify-nodus/artifacts/`.

## Proof and skip reporting

- Capture the user action and resulting DOM/store state, not merely the final screen.
- Verify side effects (store clearing, cache invalidation, redirection).
- Record the feature ID and entry point used with every artifact.
- Do not report a skipped route as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing user-visible behavior, followed by exactly four H2 sections in this order:

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with <harness>`
4. `Gotchas`

## Features

- [Authentication - Login](./auth-login.md) covers credential submission, error alerts, redirection, and session survival.
- [Authentication - Register](./auth-register.md) covers student/lecturer role toggle, validation, error handling, and account creation.
- [Protected Routes & Layouts](./protected-routes.md) covers guest bounce from protected URLs to login and authorized entry.
- [Role-Aware Navigation & Header](./role-navigation.md) covers dynamic sidebar menus per role and header sign-out.
