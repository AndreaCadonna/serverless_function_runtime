# Validation Phase — Prompt

## Agent
Load `workflow/agents/qa-engineer.agent.md` behavioral rules.

## Skills
- `validation-report` — Validation report format and testing conventions
- `git-flow` — For final git operations (tagging, etc.)

## Input
- `docs/SPEC.md` — The specification with 18 requirements and 12 scenarios (the validation contract)
- Implementation code — All source files in the repository
- `docs/DESIGN.md` — For understanding intended architecture (reference only)

## Task

1. Set up a clean validation environment:
   - Fresh terminal, no inherited processes
   - `npm install` from scratch
   - Verify Node.js version
2. Run automated tests:
   - Execute `npm test`
   - Capture full output and exit code
3. Build the scenario coverage matrix:
   - For each of the 12 scenarios (SPEC.md Section 6.1–6.12):
     a. Identify which test(s) cover this scenario
     b. Verify the test assertions match the spec's Then conditions exactly
     c. Record PASS or FAIL with specific evidence
4. Build the requirement coverage matrix:
   - For each of the 18 requirements (REQ-RTG-001 through REQ-RCV-007):
     a. Identify which scenarios cover this requirement
     b. Check if all covering scenarios passed
     c. Record coverage status
5. If any scenario is not covered by automated tests, test it manually:
   - Start the runtime
   - Send the HTTP request described in the scenario's When section
   - Compare the response to the scenario's Then section
   - Document the method, command, and result
6. Document any issues found with: what failed, expected vs. actual, severity, affected requirements.
7. Determine verdict: PASS (all scenarios pass, all requirements covered), FAIL (any scenario fails or requirement uncovered), or PARTIAL (with justification).
8. Write the validation report following the `validation-report` skill template.
9. Run the validation-report quality checklist. Fix any gaps.
10. Commit and push `docs/VALIDATION.md`. If verdict is PASS, tag the release.

## Output
Produce `docs/VALIDATION.md` following the `validation-report` skill template.

## Exit Criteria
All items in the `validation-report` skill's quality checklist pass.
