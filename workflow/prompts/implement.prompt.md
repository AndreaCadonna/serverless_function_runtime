# Implementation Phase — Prompt

## Agent
Load `workflow/agents/developer.agent.md` behavioral rules.

## Skills
- `code-quality` — Node.js code quality standards and conventions
- `git-flow` — Branching, commit, and merge conventions

## Input
- `docs/DESIGN.md` — Technical design with architecture, file structure, and implementation plan
- `docs/SPEC.md` — Specification for reference when verifying behavior

## Task

1. Read DESIGN.md completely. Understand the file structure, module responsibilities, and implementation plan.
2. Initialize the project:
   - Create `package.json` with project metadata and test script
   - Install any dependencies identified in the design (keep minimal)
3. Execute the implementation plan step by step in order:
   - For each step:
     a. Create the feature branch: `git checkout -b feature/<branch-name>`
     b. Implement the files listed for this step
     c. Self-review: check code against design module responsibilities, remove debug artifacts
     d. Run the Definition of Done command and verify the expected output
     e. Stage, commit with `type(scope): subject` and `Fulfills: REQ-XX-NNN` in body
     f. Push to remote
     g. Merge to develop/main with `--no-ff`
     h. Delete the feature branch
4. After all steps complete, run `npm test` to verify the full E2E suite passes.
5. If any step's Definition of Done fails, debug and fix before proceeding. Log any deviations.

## Output
- All source files, demo functions, test files, and config files committed and pushed
- All implementation steps verified with their Definition of Done
- `npm test` exits with code 0

## Exit Criteria
- Every implementation step's Definition of Done passed
- `npm test` exits with code 0
- All commits follow conventional format with traceability
- No deviations unlogged
