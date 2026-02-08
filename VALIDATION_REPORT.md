# VALIDATION.md — Serverless Function Runtime (Re-Validation)

## 1. Validation Summary
- **Date**: 2026-02-08
- **Spec version**: `de62afd70e57174d98c00c5af06b66d170193f03` (`docs/SPEC.md`)
- **Implementation version**: `971fb040ce69074331ada34f667d1bfe470f3350`
- **Original validation artifact**: `docs/VALIDATION.md` (pre-fix)
- **Re-validation verdict**: PASS

## 2. Scenario Re-Validation Matrix (Original -> Post-Fix)

| Scenario | Spec Section | Original Status | Post-Fix Status | Evidence |
|---|---|---|---|---|
| GET Route Dispatch from File Mapping | 6.1 | PASS | PASS | `dispatches GET /api/demo-ok from file mapping` -> 200 + `{"message":"demo-ok"}` |
| Nested Index Route Mapping | 6.2 | PASS | PASS | `maps api/users/index.js to /api/users` -> 200 + `users-index` |
| Unknown Route Returns 404 | 6.3 | PASS | PASS | `returns 404 ROUTE_NOT_FOUND for unknown route` -> 404 + `ROUTE_NOT_FOUND` |
| Method Not Allowed Returns 405 | 6.4 | PASS | PASS | `returns 405 METHOD_NOT_ALLOWED with Allow header` -> 405 + `Allow: GET` |
| Warm Module Reuse Across Invocations | 6.5 | PASS | PASS | `reuses warm module state on /api/demo-warm` -> `{count:1}` then `{count:2}` |
| Request and Response Contract Passthrough | 6.6 | FAIL | PASS | `preserves request and response contract on /api/echo` now asserts `x-echo-path=/api/echo` and `x-echo-client-id=abc-123` |
| Empty Body Handling for GET | 6.7 | PASS | PASS | `handles empty GET request body on /api/no-content` -> 204 + empty body |
| Non-Response Handler Return Value | 6.8 | PASS | PASS | `maps non-Response handler result to INVALID_HANDLER_RESPONSE` -> 500 + `INVALID_HANDLER_RESPONSE` |
| Invocation Completes Within Timeout Budget | 6.9 | PASS | PASS | `allows fast invocation under timeout budget on /api/fast` -> 200 + `fast` |
| Invocation Timeout Mapping | 6.10 | PASS | PASS | `maps invocation timeout to INVOCATION_TIMEOUT` -> 504 + `INVOCATION_TIMEOUT` |
| Handler Exception Mapping | 6.11 | PASS | PASS | `maps thrown handler errors to HANDLER_EXCEPTION` -> 500 + `HANDLER_EXCEPTION` |
| End-to-End Validation Command Pass Case | 6.12 | PASS | PASS | `npm test` exit code `0`, all subtests passing |

### 2.1 Automated Re-Validation Execution
- **Primary command run**: `npm test`
- **Exit code**: `0`
- **Output**:

```text
> serverless-function-runtime@1.0.0 test
> node --test test/e2e/runtime.e2e.test.js

TAP version 13
# Subtest: dispatches GET /api/demo-ok from file mapping
ok 1 - dispatches GET /api/demo-ok from file mapping
  ---
  duration_ms: 72.079
  ...
# Subtest: maps api/users/index.js to /api/users
ok 2 - maps api/users/index.js to /api/users
  ---
  duration_ms: 12.5403
  ...
# Subtest: returns 404 ROUTE_NOT_FOUND for unknown route
ok 3 - returns 404 ROUTE_NOT_FOUND for unknown route
  ---
  duration_ms: 8.8401
  ...
# Subtest: returns 405 METHOD_NOT_ALLOWED with Allow header
ok 4 - returns 405 METHOD_NOT_ALLOWED with Allow header
  ---
  duration_ms: 8.9555
  ...
# Subtest: reuses warm module state on /api/demo-warm
ok 5 - reuses warm module state on /api/demo-warm
  ---
  duration_ms: 9.8265
  ...
# Subtest: preserves request and response contract on /api/echo
ok 6 - preserves request and response contract on /api/echo
  ---
  duration_ms: 11.0931
  ...
# Subtest: handles empty GET request body on /api/no-content
ok 7 - handles empty GET request body on /api/no-content
  ---
  duration_ms: 7.4666
  ...
# Subtest: maps non-Response handler result to INVALID_HANDLER_RESPONSE
ok 8 - maps non-Response handler result to INVALID_HANDLER_RESPONSE
  ---
  duration_ms: 7.7939
  ...
# Subtest: allows fast invocation under timeout budget on /api/fast
ok 9 - allows fast invocation under timeout budget on /api/fast
  ---
  duration_ms: 66.8829
  ...
# Subtest: maps invocation timeout to INVOCATION_TIMEOUT
ok 10 - maps invocation timeout to INVOCATION_TIMEOUT
  ---
  duration_ms: 3019.5058
  ...
# Subtest: maps thrown handler errors to HANDLER_EXCEPTION
ok 11 - maps thrown handler errors to HANDLER_EXCEPTION
  ---
  duration_ms: 5.6977
  ...
1..11
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5316.5474
```

### 2.2 Environment Verification
- **Node.js**: `v20.19.0`
- **OS**: `Microsoft Windows NT 10.0.26100.0`
- **Clean-state checks**:
  - No inherited runtime process for `src/server.js`: none found.
  - Dependency reinstall from scratch: `npm install` completed successfully.
- **Smoke test command**: `node --test --test-name-pattern "dispatches GET /api/demo-ok from file mapping" test/e2e/runtime.e2e.test.js`
- **Smoke result**: PASS (target scenario passed; non-matching tests skipped by pattern)
- **Git state verification**:
  - `fix/validation-fixes` merge commit present on `main`: `971fb04` (`merge fix/validation-fixes`)
  - Branch list shows only `main`/`origin/main` (fix branch no longer active)

### 2.3 Fix Verification

| Fix Item | Source | Expected Post-Fix State | Actual Re-Validation Result | Held? |
|---|---|---|---|---|
| Scenario 6.6 passthrough evidence fix | Commit `63373e3` (`fix(validation): add scenario 6.6 passthrough evidence`) | Scenario 6.6 should pass with explicit URL/header passthrough evidence | PASS; assertions for `x-echo-path` and `x-echo-client-id` are present and passing | Yes |
| FIX_REPORT.md comparison target | `FIX_REPORT.md` §4.1 (requested input) | Fix-by-fix predicted table available for strict comparison | `FIX_REPORT.md` not found in repository, so strict table-level comparison unavailable | No artifact |

### 2.4 Regressions
- **None detected.**
- Every scenario that was PASS in original validation remains PASS post-fix.

## 3. Requirement Coverage Matrix (Post-Fix)

| Requirement | Covering Scenarios | All Pass? |
|---|---|---|
| REQ-RTG-001 | 6.1, 6.2 | Yes |
| REQ-RTG-002 | 6.1, 6.2 | Yes |
| REQ-RTG-003 | 6.1, 6.2, 6.5 | Yes |
| REQ-RTG-004 | 6.3 | Yes |
| REQ-RTG-005 | 6.4 | Yes |
| REQ-RTG-006 | 6.5 | Yes |
| REQ-CON-001 | 6.6 | Yes |
| REQ-CON-002 | 6.6, 6.7 | Yes |
| REQ-CON-003 | 6.6, 6.7 | Yes |
| REQ-CON-004 | 6.6 | Yes |
| REQ-CON-005 | 6.6, 6.7 | Yes |
| REQ-CON-006 | 6.8 | Yes |
| REQ-RCV-001 | 6.9, 6.10 | Yes |
| REQ-RCV-002 | 6.10 | Yes |
| REQ-RCV-003 | 6.11 | Yes |
| REQ-RCV-004 | 6.3, 6.4, 6.8, 6.10, 6.11 | Yes |
| REQ-RCV-005 | 6.1, 6.5, 6.10, 6.11, 6.12 | Yes |
| REQ-RCV-006 | 6.12 | Yes |
| REQ-RCV-007 | 6.12 | Yes |

## 4. validate.sh / demo.sh Re-Run Evidence
- **validate.sh**: `VALIDATE_SCRIPT_MISSING` (script not present in repository).
- **demo.sh**: `DEMO_SCRIPT_MISSING` (script not present in repository).
- **Impact**: Re-validation used the existing automated entrypoint (`npm test`) and scenario-level evidence in `test/e2e/runtime.e2e.test.js`. No validation scripts were modified.

## 5. Issues Found
1. **Process artifact gap: `FIX_REPORT.md` missing**
   - Expected: file present for strict Phase 5b cross-check against §4.1.
   - Actual: file absent; only fix commit evidence available.
   - Severity: Medium (process traceability), not a functional runtime defect.

2. **Script artifact gap: `validate.sh` and `demo.sh` missing**
   - Expected by prompt: existing scripts re-run unchanged.
   - Actual: scripts absent in repository.
   - Severity: Medium (workflow reproducibility), not a functional runtime defect.

## 6. Verdict
- **Did the fixes resolve the issues?** Yes. The only failing scenario from the original report (6.6) now passes with explicit assertions for required Then conditions.
- **Are there regressions?** No. All scenarios previously PASS remained PASS.
- **Is the experiment now successful?** Yes for runtime behavior against SPEC scenarios and requirements. There are still documentation/workflow artifact gaps (`FIX_REPORT.md`, `validate.sh`, `demo.sh`) that should be addressed for full process traceability.
- **Overall verdict**: PASS

## 7. Validation Quality Checklist
- [x] Every scenario from original validation is accounted for
- [x] Regressions explicitly checked and reported
- [x] Scenario status comparison included (Original -> Post-Fix)
- [x] Requirement coverage matrix updated post-fix
- [x] `npm test` output included verbatim
- [x] No validation scripts modified
- [x] Verdict explicitly answers fix success, regressions, and experiment success
