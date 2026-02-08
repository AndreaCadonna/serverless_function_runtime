# Fix — Prompt

## Context

You are executing **Phase 5a** of the agentic spec-driven development workflow. Validation (Phase 4) found failures. Your job is to diagnose, propose fixes, execute approved fixes, and prepare for re-validation.

**This phase has a user gate.** You will produce a fix plan first and STOP. Only after user approval do you execute fixes.

## Skills

Load and follow these skills for this task:

- **`fix-report.skill.md`** — Defines the fix plan format, FIX_REPORT.md format, diagnosis standards, and quality checklist
- **`code-quality.skill.md`** — Coding standards to follow when modifying code
- **`git-flow.skill.md`** — Branch and commit conventions for the fix branch

## Input Available in the working directory:

**SPEC.md**
**DESIGN.md**
**IMPLEMENTATION.md**
**VALIDATION_REPORT.md**
**Codebase**

## Task

Execute these phases in order:

### Phase A — Diagnosis

1. **Read VALIDATION_REPORT.md fully.** Identify every scenario marked ❌ FAIL.
2. **Read the failure details.** For each failure: expected output, actual output, diff, and the QA agent's root cause analysis.
3. **Verify the failures yourself.** Run the failing scenarios to confirm they still fail and to understand the actual behavior.
4. **Trace each failure to source code.** Follow the data flow: input → function calls → output. Identify the exact point where behavior diverges from SPEC expectation.
5. **Group failures by root cause.** Multiple scenarios may fail for the same underlying reason. Assign root cause IDs (RC-001, RC-002, ...).
6. **Classify each root cause.** Use exactly the categories from `fix-report.skill.md`: code-bug, data-issue, setup-issue, spec-ambiguity, design-gap, validation-error.
7. **Separate fixable from unfixable.** code-bug, data-issue, and setup-issue are fixable. spec-ambiguity, design-gap, and validation-error require upstream changes.

### Phase B — Fix Plan (STOP HERE — WAIT FOR USER APPROVAL)

1. **Produce the Fix Plan** following the template in `fix-report.skill.md`.
2. **For each fixable item**: describe the exact change, which files, which functions, which lines. Be specific enough that someone could review the plan without reading the code.
3. **For each unfixable item**: explain why and recommend what upstream change would resolve it.
4. **Assess blast radius.** For each fix, list which currently-passing scenarios could be affected.
5. **Order fixes by independence.** Isolated fixes first, shared-code fixes last.

**⏸️ PRESENT THE FIX PLAN TO THE USER AND WAIT FOR APPROVAL.**

The user may:
- Approve all fixes → proceed to Phase C
- Approve some fixes → proceed to Phase C with only approved fixes
- Reject and provide direction → revise the plan
- Decide to return to an earlier phase → stop

### Phase C — Execute Fixes (only after user approval)

1. **Create branch** `fix/validation-fixes` from develop.
2. **For each approved fix, in the planned order:**
   a. Make the code change — minimal diff, no extras
   b. Run the affected scenarios — verify the fix works
   c. Run blast radius scenarios — verify nothing broke
   d. Commit with message: `fix(component): description — fixes Scenario 6.X, 6.Y`
   e. Push
3. **If a fix breaks a passing scenario**: revert the fix, document as unfixable with reason "fix causes regression in Scenario 6.Z", move to next fix.
4. **After all fixes applied**: run ALL scenarios (not just affected ones) to get a complete post-fix picture.
5. **Merge** `fix/validation-fixes` into develop with `--no-ff`, push, delete branch.

### Phase D — Write Fix Report

Compile all findings into `FIX_REPORT.md` following the format in `fix-report.skill.md`. Include:
- Complete root cause analysis table
- Details of each fix applied with before/after verification
- Unfixable items with recommendations
- Complete before/after scenario comparison table
- Git history showing fix commits
- Clear recommendation for next step

Commit `FIX_REPORT.md` on develop with message: `docs: add fix report for validation failures`

## Output

Two deliverables at different stages:

1. **Fix Plan** (before approval gate) — following the template in `fix-report.skill.md`
2. **After approval:**
   - **Fixed codebase** — with targeted changes only
   - **`FIX_REPORT.md`** — following the format in `fix-report.skill.md`
   - **Updated git repository** — with fix branch merged into develop

## Exit Criteria

Run through the quality checklist in `fix-report.skill.md` and git checklist in `git-flow.skill.md`. All items must pass.

---

> **User action after receiving output**: Review FIX_REPORT.md §4 (Post-Fix State) and §6 (Recommendation). Then proceed to Phase 5b (Re-Validation).
