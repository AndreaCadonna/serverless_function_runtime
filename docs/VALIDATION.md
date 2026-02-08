# VALIDATION.md — Serverless Function Runtime

## 1. Validation Summary
- **Date**: 2026-02-08
- **Spec version**: `de62afd70e57174d98c00c5af06b66d170193f03` (`docs/SPEC.md`)
- **Implementation version**: `de62afd70e57174d98c00c5af06b66d170193f03`
- **Verdict**: FAIL

## 2. Environment
- **Node.js version**: `v20.19.0`
- **OS**: `Microsoft Windows 10.0.26100`
- **Setup steps**:
  1. Verified no inherited runtime process:
     - Command: `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'src/server.js' }`
     - Result: `NO_RUNTIME_PROCESS`
  2. Reinstalled dependencies from clean local state:
     - Command: `if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }; npm install`
     - Result: `up to date, audited 1 package ... found 0 vulnerabilities`
  3. Verified runtime version:
     - Command: `node --version`
     - Result: `v20.19.0`

## 3. Automated Test Results
- **Command**: `npm test`
- **Exit code**: `0`
- **Output**:

```text
> serverless-function-runtime@1.0.0 test
> node --test test/e2e/runtime.e2e.test.js

TAP version 13
# Subtest: dispatches GET /api/demo-ok from file mapping
ok 1 - dispatches GET /api/demo-ok from file mapping
  ---
  duration_ms: 71.4964
  ...
# Subtest: maps api/users/index.js to /api/users
ok 2 - maps api/users/index.js to /api/users
  ---
  duration_ms: 11.2724
  ...
# Subtest: returns 404 ROUTE_NOT_FOUND for unknown route
ok 3 - returns 404 ROUTE_NOT_FOUND for unknown route
  ---
  duration_ms: 7.4904
  ...
# Subtest: returns 405 METHOD_NOT_ALLOWED with Allow header
ok 4 - returns 405 METHOD_NOT_ALLOWED with Allow header
  ---
  duration_ms: 8.4713
  ...
# Subtest: reuses warm module state on /api/demo-warm
ok 5 - reuses warm module state on /api/demo-warm
  ---
  duration_ms: 10.8169
  ...
# Subtest: preserves request and response contract on /api/echo
ok 6 - preserves request and response contract on /api/echo
  ---
  duration_ms: 10.7635
  ...
# Subtest: handles empty GET request body on /api/no-content
ok 7 - handles empty GET request body on /api/no-content
  ---
  duration_ms: 8.642
  ...
# Subtest: maps non-Response handler result to INVALID_HANDLER_RESPONSE
ok 8 - maps non-Response handler result to INVALID_HANDLER_RESPONSE
  ---
  duration_ms: 7.4422
  ...
# Subtest: allows fast invocation under timeout budget on /api/fast
ok 9 - allows fast invocation under timeout budget on /api/fast
  ---
  duration_ms: 65.5876
  ...
# Subtest: maps invocation timeout to INVOCATION_TIMEOUT
ok 10 - maps invocation timeout to INVOCATION_TIMEOUT
  ---
  duration_ms: 3012.5354
  ...
# Subtest: maps thrown handler errors to HANDLER_EXCEPTION
ok 11 - maps thrown handler errors to HANDLER_EXCEPTION
  ---
  duration_ms: 5.608
  ...
1..11
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5301.4869
```

## 4. Scenario Coverage Matrix

| Scenario | Spec Section | Requirements | Result | Evidence |
|----------|--------------|--------------|--------|----------|
| GET Route Dispatch from File Mapping | 6.1 | REQ-RTG-001, REQ-RTG-002, REQ-RTG-003, REQ-RCV-005 | PASS | Test `dispatches GET /api/demo-ok from file mapping` asserts `200` and `{"message":"demo-ok"}` |
| Nested Index Route Mapping | 6.2 | REQ-RTG-001, REQ-RTG-002, REQ-RTG-003 | PASS | Test `maps api/users/index.js to /api/users` asserts `200` and `users-index` |
| Unknown Route Returns 404 | 6.3 | REQ-RTG-004, REQ-RCV-004 | PASS | Test `returns 404 ROUTE_NOT_FOUND for unknown route` asserts `404`, `errorCode=ROUTE_NOT_FOUND`, non-empty `message` |
| Method Not Allowed Returns 405 | 6.4 | REQ-RTG-005, REQ-RCV-004 | PASS | Test `returns 405 METHOD_NOT_ALLOWED with Allow header` asserts `405`, `Allow=GET`, `errorCode=METHOD_NOT_ALLOWED` |
| Warm Module Reuse Across Invocations | 6.5 | REQ-RTG-006, REQ-RTG-003, REQ-RCV-005 | PASS | Test `reuses warm module state on /api/demo-warm` asserts sequential counts `1` then `2`, both `200` |
| Request and Response Contract Passthrough | 6.6 | REQ-CON-001, REQ-CON-002, REQ-CON-003, REQ-CON-004, REQ-CON-005 | FAIL | Test `preserves request and response contract on /api/echo` asserts status/header/body passthrough, but does **not** assert handler-observed URL ending `/api/echo` nor handler-observed header `x-client-id=abc-123` |
| Empty Body Handling for GET | 6.7 | REQ-CON-002, REQ-CON-003, REQ-CON-005 | PASS | Test `handles empty GET request body on /api/no-content` asserts `204` with empty response body |
| Non-Response Handler Return Value | 6.8 | REQ-CON-006, REQ-RCV-004 | PASS | Test `maps non-Response handler result to INVALID_HANDLER_RESPONSE` asserts `500`, `errorCode=INVALID_HANDLER_RESPONSE`, non-empty `message` |
| Invocation Completes Within Timeout Budget | 6.9 | REQ-RCV-001 | PASS | Test `allows fast invocation under timeout budget on /api/fast` asserts `200` with `fast` (no timeout mapping) |
| Invocation Timeout Mapping | 6.10 | REQ-RCV-001, REQ-RCV-002, REQ-RCV-004, REQ-RCV-005 | PASS | Test `maps invocation timeout to INVOCATION_TIMEOUT` asserts `504`, `errorCode=INVOCATION_TIMEOUT`, timeout message pattern `3000ms timeout` |
| Handler Exception Mapping | 6.11 | REQ-RCV-003, REQ-RCV-004, REQ-RCV-005 | PASS | Test `maps thrown handler errors to HANDLER_EXCEPTION` asserts `500`, `errorCode=HANDLER_EXCEPTION`, message contains `boom` |
| End-to-End Validation Command Pass Case | 6.12 | REQ-RCV-006, REQ-RCV-007, REQ-RCV-005 | PASS | `npm test` output shows all subtests passing and exit code `0`; demo routes are exercised by subtests for `/api/demo-ok`, `/api/demo-error`, `/api/demo-timeout`, `/api/demo-warm` |

## 5. Requirement Coverage Matrix

| Requirement | Scenarios Covering It | All Pass? |
|-------------|-----------------------|-----------|
| REQ-RTG-001 | 6.1, 6.2 | Yes |
| REQ-RTG-002 | 6.1, 6.2 | Yes |
| REQ-RTG-003 | 6.1, 6.2, 6.5 | Yes |
| REQ-RTG-004 | 6.3 | Yes |
| REQ-RTG-005 | 6.4 | Yes |
| REQ-RTG-006 | 6.5 | Yes |
| REQ-CON-001 | 6.6 | No |
| REQ-CON-002 | 6.6, 6.7 | No |
| REQ-CON-003 | 6.6, 6.7 | No |
| REQ-CON-004 | 6.6 | No |
| REQ-CON-005 | 6.6, 6.7 | No |
| REQ-CON-006 | 6.8 | Yes |
| REQ-RCV-001 | 6.9, 6.10 | Yes |
| REQ-RCV-002 | 6.10 | Yes |
| REQ-RCV-003 | 6.11 | Yes |
| REQ-RCV-004 | 6.3, 6.4, 6.8, 6.10, 6.11 | Yes |
| REQ-RCV-005 | 6.1, 6.5, 6.10, 6.11, 6.12 | Yes |
| REQ-RCV-006 | 6.12 | Yes |
| REQ-RCV-007 | 6.12 | Yes |

## 6. Issues Found

1. **Scenario 6.6 assertion mismatch against spec Then conditions**
   - **What failed**: Validation evidence does not prove two required Then conditions in SPEC 6.6.
   - **Expected**:
     - Handler receives URL ending with `/api/echo`.
     - Handler receives header `x-client-id` with value `abc-123`.
   - **Actual**:
     - Automated test verifies status (`201`), response header passthrough (`x-echo-method`, `content-type`), and body passthrough (`ping=1`).
     - No assertion verifies handler-observed URL or handler-observed `x-client-id`.
   - **Severity**: High
   - **Affected requirements**: REQ-CON-001 (primary), and scenario-linked coverage for REQ-CON-002/003/004/005 via 6.6.

## 7. Verdict Rationale

Automated execution (`npm test`) passed with exit code `0`, and 11 of 12 spec scenarios have direct passing evidence. However, Scenario 6.6 fails validation due missing assertions for two explicit Then conditions (handler-observed URL and `x-client-id` header). Because scenario-level validation is incomplete for 6.6, requirement coverage is not complete for REQ-CON-001 and scenario-linked REQ-CON-* rows. Under the conservative rule, this yields a **FAIL** verdict.

## 8. Validation-Report Quality Checklist

- [x] All 12 spec scenarios (6.1–6.12) have a row in the coverage matrix
- [x] All 18 requirements have a row in the requirement coverage matrix
- [x] `npm test` output is included verbatim
- [x] Every FAIL result has a specific issue description
- [x] Verdict matches the evidence (no optimistic overrides)
- [x] Environment section is complete and reproducible
