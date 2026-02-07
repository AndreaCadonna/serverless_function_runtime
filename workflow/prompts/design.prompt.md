# Design Phase — Prompt

## Agent
Load `workflow/agents/architect.agent.md` behavioral rules.

## Skills
- `design-document` — Defines the output format and design conventions
- `git-flow` — Defines branching and commit conventions for the implementation plan

## Input
- `docs/SPEC.md` — The full specification with 18 requirements and 12 scenarios
- `docs/RESEARCH.md` — Problem analysis, approach selection (4.2: warm worker runtime), scope decisions

## Task

1. Read SPEC.md completely. List every requirement (REQ-RTG-001 through REQ-RCV-007).
2. Read RESEARCH.md Section 4.4 (recommended approach) and Section 5 (scope decisions).
3. Design the architecture:
   - Define the HTTP server entry point
   - Define the route discovery module (scan `api/`, build route map)
   - Define the request adapter (Node.js HTTP → Web-standard Request)
   - Define the dispatcher (route lookup → method handler invocation → timeout enforcement)
   - Define the response adapter (Web-standard Response → Node.js HTTP response)
   - Define the error handler (exception/timeout → JSON error response)
4. Define the complete file structure including source files, demo functions, test files, and config files (package.json, etc.).
5. Map every requirement to at least one module.
6. Write the data flow: how an HTTP request moves through the system from arrival to response.
7. Create the implementation plan as ordered steps, each with:
   - Feature branch name
   - Files created or modified
   - What to implement
   - Requirements fulfilled
   - Definition of Done (literal command + expected output)
8. Define the demo functions table (routes, files, behavior, requirements validated).
9. Define the test plan (how E2E tests work, what scenarios they cover).
10. Run the design-document quality checklist. Fix any gaps.

## Output
Produce `docs/DESIGN.md` following the `design-document` skill template.

## Exit Criteria
All items in the `design-document` skill's quality checklist pass.
