# Re-Validation — Prompt

## Context

You are executing **Phase 5b** — re-validation after fixes. Phase 4 found failures. Phase 5a applied fixes. Your job is to independently verify that the fixes work and nothing else broke.

You are **independent from the fix agent**. Do not trust its self-assessment in FIX_REPORT.md. Re-verify everything yourself.

**This is a single pass.** Run validation, report results, done. If failures remain, they are documented for the user to decide next steps — not for another fix cycle.

## Skills

Load and follow these skills for this task:

- **`validation-report.skill.md`** — Defines formats for validate.sh, demo.sh, and VALIDATION_REPORT.md
- **`git-flow.skill.md`** — Git finalization protocol

## Input Available in the working directory

**SPEC.md**
**VALIDATION_REPORT.md** 
**FIX_REPORT.md** 
**Codebase**

## Task

Execute these phases in order:

### Phase A — Environment Verification

1. **Set up from scratch.** Clean environment, follow IMPLEMENTATION.md setup instructions. If the fix agent changed setup steps, use the updated ones.
2. **Verify git state.** Confirm `fix/validation-fixes` has been merged into develop. Check commit history matches FIX_REPORT.md §5.
3. **Smoke test.** Run the quick verification command. Record result.

### Phase B — Full Re-Validation

1. **Run the EXISTING `validate.sh`** — the same script from Phase 4, unmodified. Do not create a new one.
2. **Record all results.** Every scenario, pass or fail.
3. **Compare against original VALIDATION_REPORT.md §2.** For each scenario, note: was it passing before? Is it passing now? Did its status change?
4. **Compare against FIX_REPORT.md §4.1.** Does the fix agent's predicted post-fix state match reality?

### Phase C — Regression Check

1. **Identify regressions.** Any scenario that was ✅ PASS in the original validation but is now ❌ FAIL is a regression. This is a critical finding.
2. **Identify persistent failures.** Any scenario that was ❌ FAIL before and is still ❌ FAIL. Cross-reference with FIX_REPORT.md — was it classified as unfixable?
3. **Identify successful fixes.** Any scenario that was ❌ FAIL before and is now ✅ PASS. Confirm the fix agent claimed to fix it.

### Phase D — Re-Run Demo

1. **Run the EXISTING `demo.sh`** — the same script from Phase 4, unmodified.
2. **Record output.** If the demo now works better (or worse) than before, note the difference.

### Phase E — Git Finalization

Follow `git-flow.skill.md`:

1. Create `feature/re-validation` branch from develop
2. Commit the updated validation report
3. Merge into develop with `--no-ff`
4. **If all scenarios pass (or all failures are documented unfixable items)**: merge develop → main, tag `v0.1.0` (or increment if tag exists), push with tags
5. **If regressions exist or unexpected failures remain**: leave main untouched, document why

### Phase F — Write Re-Validation Report

Update `VALIDATION_REPORT.md` (replace the original) following the format in `validation-report.skill.md`, with these additions:

- **§2 must include a comparison column**: Original Status → Post-Fix Status for every scenario
- **A new subsection §2.3 — Fix Verification**: table showing each fix from FIX_REPORT.md and whether it held
- **A new subsection §2.4 — Regressions**: any scenarios that got worse, with analysis
- **§6 Verdict** must address: "Did the fixes resolve the issues? Are there regressions? Is the experiment now successful?"

## Output

1. **Updated `VALIDATION_REPORT.md`** — with comparison data showing before/after fix results
2. **Updated demo transcript** (if demo behavior changed)
3. **Finalized git repository** — with appropriate main merge and tag (or documentation of why main was not updated)

## Exit Criteria

Run through the quality checklist in `validation-report.skill.md` and git checklist in `git-flow.skill.md`. Additionally:

- [ ] Every scenario from original validation is accounted for in re-validation
- [ ] Every fix from FIX_REPORT.md has a verified outcome (held / didn't hold)
- [ ] Regressions (if any) are explicitly identified and analyzed
- [ ] Verdict clearly states whether the experiment now succeeds
- [ ] No validation scripts were modified (used the originals from Phase 4)

---

> **This is the final phase.** If failures remain after re-validation, the user decides whether to:
> - Accept the experiment as partially successful (document in verdict)
> - Return to Phase 1/2 for upstream changes (spec or design revision)
> - Run another fix cycle (repeat Phase 5a → 5b with the new validation report)
