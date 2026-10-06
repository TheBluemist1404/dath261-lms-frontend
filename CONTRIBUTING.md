# Contributing

This repository is a team coursework project. The workflow is intentionally strict enough to keep the codebase clean while preserving clear evidence of each member's contribution.

## 1. Start From an Issue

Create or claim an issue before starting non-trivial work.

The issue should describe:

- the problem or deliverable;
- the expected scope;
- acceptance criteria;
- testing/evidence required;
- dependencies or blockers.

Keep one primary owner whenever possible so contribution history stays clear.

## 2. Branch From `main`

Update your local `main` before creating a branch:

```bash
git switch main
git pull --ff-only
git switch -c feat/42-course-enrollment
```

Use short branch names tied to the issue when possible:

```text
feat/42-course-enrollment
fix/57-expired-token
refactor/63-workspace-sidebar
test/71-resource-reference
docs/18-setup-guide
chore/24-ci-cache
```

Do not develop directly on `main`.

## 3. Follow the Frontend Boundaries

The application uses a feature-first structure.

- `routes/` owns routing concerns: params, search params, loaders, guards, redirects, and layouts.
- `features/<feature>/` owns domain-specific components, hooks, API calls, queries, and types.
- `components/ui/` is only for reusable domain-agnostic UI.
- `lib/` contains shared infrastructure such as HTTP and query clients.

Avoid putting business logic into route files or turning shared folders into catch-all directories.

## 4. Commit Cleanly

Husky automatically checks staged files and TypeScript before a commit. Commit messages are validated by commitlint.

Use Conventional Commits:

```text
feat: add course enrollment form
fix: handle revoked course resource access
test: cover lesson completion query
refactor: extract workspace navigation
docs: clarify local setup
chore: update CI cache configuration
```

Each commit should represent a meaningful change. Do not rely on the final merge to hide a sequence of temporary commits.

Never bypass hooks with `--no-verify` just to make a broken commit pass. Fix the underlying problem.

## 5. Test the Change

Choose the smallest test level that gives useful confidence:

- pure logic/utilities → Vitest;
- React UI and hooks → React Testing Library;
- API-facing frontend behavior → MSW;
- complete user journeys → Playwright once E2E infrastructure is introduced.

Before opening a PR, run:

```bash
pnpm run ci
```

This checks Biome, TypeScript, tests, and the production build.

## 6. Open a Focused Pull Request

Keep pull requests small enough to review meaningfully.

The PR should:

- link its issue with `Closes #<issue>` when appropriate;
- explain the user-visible or architectural change;
- describe how it was verified;
- include screenshots/video for meaningful UI changes;
- include or update tests for behavior changes;
- call out known limitations or follow-up work.

Do not mix unrelated cleanup into a feature PR unless the cleanup is required for the feature.

## 7. Review and Merge

A PR is ready to merge when:

- the intended acceptance criteria are satisfied;
- CI passes;
- relevant tests exist and pass;
- review comments are resolved;
- there are no unresolved conflicts with `main`;
- documentation is updated when behavior or developer workflow changes.

Because individual contribution history matters for the course, keep commits meaningful before review. Review should focus on correctness, maintainability, security boundaries, test evidence, and whether the change stays within project scope.

## Security Notes

- Never commit passwords, access tokens, private keys, production credentials, or real user data.
- Frontend role checks are not authorization. Protected operations must still be enforced by the backend.
- Course-resource references and collaboration sockets must not expose protected content after enrollment or membership is revoked.
- Report suspected security issues to the team directly rather than publishing exploit details in a public issue.

## Dependency Changes

Do not add a new dependency only to save a few lines of code.

When adding one, the PR should make clear:

- what problem it solves;
- why existing dependencies/platform APIs are insufficient;
- whether it affects bundle size, security, or maintenance.

Application-specific libraries such as Lexical, Yjs, and Playwright should be introduced with the feature that actually uses them.
