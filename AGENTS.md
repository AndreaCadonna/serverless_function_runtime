# Serverless Function Runtime

## Project Overview

A local serverless functions runtime that maps files in an `api/` directory to HTTP endpoints, dispatches requests through a strict Web-standard `Request` → `Response` contract, and executes handlers on demand. Comparable to Vercel Functions or AWS Lambda for local development.

## Technology Stack

- **Runtime**: Node.js (modern JavaScript or TypeScript)
- **Handler contract**: Web-standard `Request`/`Response` with HTTP-method-named exports
- **Dependencies**: Minimal — no required framework dependency
- **Testing**: Automated E2E tests via `npm test`
- **Routing**: File-based from `api/` directory

## Key Artifacts

- `docs/RESEARCH.md` — Problem analysis, approach selection, scope decisions
- `docs/SPEC.md` — 18 requirements (REQ-RTG, REQ-CON, REQ-RCV), 12 behavior scenarios, data model, interface contracts
- `docs/DESIGN.md` — Technical design (created during design phase)

## Requirement Prefixes

- `REQ-RTG-*` — Routing and Dispatch (6 requirements)
- `REQ-CON-*` — Invocation Contract Normalization (6 requirements)
- `REQ-RCV-*` — Runtime Controls and Validation Assets (7 requirements)

## Error Response Contract

All runtime-generated errors use this JSON structure:

```json
{"errorCode": "<CODE>", "message": "<human-readable detail>"}
```

Error codes: `ROUTE_NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405), `HANDLER_EXCEPTION` (500), `INVALID_HANDLER_RESPONSE` (500), `INVOCATION_TIMEOUT` (504).

## Universal Rules

1. **Spec is the source of truth.** Every implementation decision must trace to a requirement in `docs/SPEC.md`. If a requirement is ambiguous, ask — do not invent.
2. **Git discipline.** Branch per task, small atomic commits, conventional commit messages (`type(scope): subject`), push after every commit, merge with `--no-ff`.
3. **Self-review before commit.** Run the code, check against design, check against spec, remove debug artifacts, review staged changes before committing.
4. **Incremental verification.** Every implementation step must produce a verifiable result. Define and execute a "Definition of Done" check before moving on.
5. **Deviation logging.** Any difference from the design must be documented: what was planned, what was done instead, why, and what is affected.
6. **Traceability.** Use `Fulfills: REQ-XX-NNN` in commit messages. Every piece of code must trace back to a requirement.
7. **No over-engineering.** Only implement what the spec requires. No speculative features, no premature abstractions, no extra configurability.
8. **Timeout budget is 3000ms.** This is a hard spec constraint (REQ-RCV-001), not a tunable parameter.
