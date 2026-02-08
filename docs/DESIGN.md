# DESIGN.md — Serverless Function Runtime

## 1. Architecture Overview
The system uses the RESEARCH 4.4 recommended approach: one long-lived local Node.js HTTP runtime process (warm worker model) that discovers `api/` files, maps them to `/api/*` routes, dispatches by HTTP-method-named exports, and bridges Node HTTP transport to Web-standard `Request` -> `Response`. The runtime keeps module instances warm inside the same process, enforces a fixed 3000ms invocation timeout, and maps runtime failures to the required JSON error contract. This stays within RESEARCH Section 5 scope and excludes out-of-scope platform concerns.

## 2. Requirement Inventory

### 2.1 REQ-RTG (Routing and Dispatch)
- `REQ-RTG-001`: Discover function files under `api/` and expose each discovered file as `/api/` route.
- `REQ-RTG-002`: Derive route path by removing file extension and terminal `/index` segment.
- `REQ-RTG-003`: Invoke exported handler whose name equals incoming HTTP method.
- `REQ-RTG-004`: Return `404` with JSON error payload when route does not exist.
- `REQ-RTG-005`: Return `405` with `Allow` header and JSON error payload when route exists but method unsupported.
- `REQ-RTG-006`: Reuse loaded function module across repeated invocations in one runtime process.

### 2.2 REQ-CON (Invocation Contract Normalization)
- `REQ-CON-001`: Provide Web `Request` with method, URL, and headers equal to incoming request.
- `REQ-CON-002`: Provide `Request` body stream with exact incoming body bytes.
- `REQ-CON-003`: Return handler `Response` status without modification.
- `REQ-CON-004`: Return handler `Response` headers without modification.
- `REQ-CON-005`: Return handler `Response` body bytes without modification.
- `REQ-CON-006`: Return `500` JSON error when handler does not return a Web `Response`.

### 2.3 REQ-RCV (Runtime Controls and Validation Assets)
- `REQ-RCV-001`: Enforce `3000ms` timeout budget for every invocation.
- `REQ-RCV-002`: Return `504` JSON error when invocation exceeds timeout budget.
- `REQ-RCV-003`: Return `500` JSON error when handler throws or rejects.
- `REQ-RCV-004`: All runtime-generated error bodies are JSON with `errorCode` and `message`.
- `REQ-RCV-005`: Include demo routes `/api/demo-ok`, `/api/demo-error`, `/api/demo-timeout`, `/api/demo-warm`.
- `REQ-RCV-006`: Include automated E2E suite runnable via `npm test`.
- `REQ-RCV-007`: `npm test` exits with code `0` when all E2E tests pass.

## 3. File Structure
```text
.
|-- api/
|   |-- bad-return.js
|   |-- demo-error.js
|   |-- demo-ok.js
|   |-- demo-timeout.js
|   |-- demo-warm.js
|   |-- echo.js
|   |-- fast.js
|   |-- no-content.js
|   `-- users/
|       `-- index.js
|-- docs/
|   |-- DESIGN.md
|   |-- RESEARCH.md
|   `-- SPEC.md
|-- src/
|   |-- dispatcher.js
|   |-- error-handler.js
|   |-- request-adapter.js
|   |-- response-adapter.js
|   |-- route-discovery.js
|   `-- server.js
|-- test/
|   `-- e2e/
|       |-- runtime.e2e.test.js
|       `-- runtime-harness.js
|-- .gitignore
|-- package-lock.json
`-- package.json
```

## 4. Module Responsibilities

### 4.1 HTTP Server Entry Point — `src/server.js`
- **Purpose**: Start/stop local HTTP server, initialize route map, and run per-request pipeline.
- **Inputs**: Startup config (port), Node `IncomingMessage` and `ServerResponse`.
- **Outputs**: Listening runtime server and completed HTTP responses.
- **Key decisions**: One process, one route map at startup, warm in-memory execution model.
- **Fulfills**: `REQ-RTG-001`, `REQ-RTG-003`, `REQ-RTG-006`.

### 4.2 Route Discovery — `src/route-discovery.js`
- **Purpose**: Recursively scan `api/`, normalize route paths, and build route definitions with supported methods.
- **Inputs**: Filesystem root `api/`.
- **Outputs**: `Map<routePath, RouteDefinition>` containing file path, module reference, and allow-list.
- **Key decisions**: Route normalization removes extension and terminal `/index`; modules are imported once and reused.
- **Fulfills**: `REQ-RTG-001`, `REQ-RTG-002`, `REQ-RTG-006`.

### 4.3 Request Adapter — `src/request-adapter.js`
- **Purpose**: Convert Node HTTP request into Web-standard `Request`.
- **Inputs**: Node `IncomingMessage`, base origin.
- **Outputs**: Web `Request` with method, URL, headers, and exact body bytes.
- **Key decisions**: Read raw stream bytes once and pass bytes unchanged into `Request` body.
- **Fulfills**: `REQ-CON-001`, `REQ-CON-002`.

### 4.4 Dispatcher — `src/dispatcher.js`
- **Purpose**: Perform route lookup, method dispatch, timeout enforcement, and handler-return validation.
- **Inputs**: Web `Request`, route map.
- **Outputs**: Web `Response` from handler or runtime error response.
- **Key decisions**: Hard-code `3000ms` timeout constant; invoke export matching HTTP method; route all runtime failures through error handler.
- **Fulfills**: `REQ-RTG-003`, `REQ-RTG-004`, `REQ-RTG-005`, `REQ-CON-006`, `REQ-RCV-001`, `REQ-RCV-002`, `REQ-RCV-003`.

### 4.5 Response Adapter — `src/response-adapter.js`
- **Purpose**: Serialize Web `Response` back to Node HTTP response.
- **Inputs**: Web `Response`, Node `ServerResponse`.
- **Outputs**: Node HTTP status/headers/body bytes written unchanged.
- **Key decisions**: Transfer status, headers, and bytes directly without transformation.
- **Fulfills**: `REQ-CON-003`, `REQ-CON-004`, `REQ-CON-005`.

### 4.6 Error Handler — `src/error-handler.js`
- **Purpose**: Produce standardized runtime-generated JSON errors.
- **Inputs**: Runtime error type + message + optional headers.
- **Outputs**: Web `Response` with status and body `{"errorCode":"<CODE>","message":"<detail>"}`.
- **Key decisions**: Central code-to-status map for `ROUTE_NOT_FOUND`, `METHOD_NOT_ALLOWED`, `HANDLER_EXCEPTION`, `INVALID_HANDLER_RESPONSE`, `INVOCATION_TIMEOUT`.
- **Fulfills**: `REQ-RTG-004`, `REQ-RTG-005`, `REQ-CON-006`, `REQ-RCV-002`, `REQ-RCV-003`, `REQ-RCV-004`.

### 4.7 Demo Functions — `api/*.js`
- **Purpose**: Provide required demonstration routes and scenario fixtures.
- **Inputs**: Web `Request`.
- **Outputs**: Deterministic `Response`, thrown error, invalid return, or timeout behavior depending on file.
- **Key decisions**: Keep handlers minimal and scenario-aligned.
- **Fulfills**: `REQ-RCV-005`.

### 4.8 E2E Validation Assets — `test/e2e/*`, `package.json`
- **Purpose**: Run transport-level validation with `npm test` and assert scenario behaviors.
- **Inputs**: Runtime process, HTTP requests, expected scenario assertions.
- **Outputs**: Test pass/fail report and process exit code.
- **Key decisions**: Use built-in Node test runner for minimal dependencies.
- **Fulfills**: `REQ-RCV-006`, `REQ-RCV-007`.

## 5. Requirement-to-Module Mapping
| Requirement | Module(s) |
|---|---|
| `REQ-RTG-001` | `src/route-discovery.js`, `src/server.js` |
| `REQ-RTG-002` | `src/route-discovery.js` |
| `REQ-RTG-003` | `src/dispatcher.js`, `src/server.js` |
| `REQ-RTG-004` | `src/dispatcher.js`, `src/error-handler.js` |
| `REQ-RTG-005` | `src/dispatcher.js`, `src/error-handler.js` |
| `REQ-RTG-006` | `src/route-discovery.js`, `src/server.js` |
| `REQ-CON-001` | `src/request-adapter.js` |
| `REQ-CON-002` | `src/request-adapter.js` |
| `REQ-CON-003` | `src/response-adapter.js` |
| `REQ-CON-004` | `src/response-adapter.js` |
| `REQ-CON-005` | `src/response-adapter.js` |
| `REQ-CON-006` | `src/dispatcher.js`, `src/error-handler.js` |
| `REQ-RCV-001` | `src/dispatcher.js` |
| `REQ-RCV-002` | `src/dispatcher.js`, `src/error-handler.js` |
| `REQ-RCV-003` | `src/dispatcher.js`, `src/error-handler.js` |
| `REQ-RCV-004` | `src/error-handler.js` |
| `REQ-RCV-005` | `api/demo-ok.js`, `api/demo-error.js`, `api/demo-timeout.js`, `api/demo-warm.js` |
| `REQ-RCV-006` | `test/e2e/runtime.e2e.test.js`, `package.json` |
| `REQ-RCV-007` | `test/e2e/runtime.e2e.test.js`, `package.json` |

## 6. Data Flow
1. `src/server.js` accepts an incoming HTTP request.
2. `src/request-adapter.js` converts Node request metadata and exact body bytes into a Web `Request`.
3. `src/server.js` passes the Web `Request` and route map to `src/dispatcher.js`.
4. `src/dispatcher.js` resolves route by `pathname`.
5. If route is missing, `src/error-handler.js` returns `404 ROUTE_NOT_FOUND` JSON response.
6. If route exists but method export is missing, `src/error-handler.js` returns `405 METHOD_NOT_ALLOWED` JSON response with `Allow` header.
7. If route + method are valid, dispatcher invokes the method export with the Web `Request`.
8. Invocation runs under a fixed 3000ms timeout guard.
9. If invocation throws/rejects, dispatcher returns `500 HANDLER_EXCEPTION` via error handler.
10. If timeout wins, dispatcher returns `504 INVOCATION_TIMEOUT` via error handler.
11. If handler resolves to a non-`Response`, dispatcher returns `500 INVALID_HANDLER_RESPONSE` via error handler.
12. On valid `Response`, `src/response-adapter.js` writes status/headers/body bytes unchanged to Node response.

## 7. Implementation Plan

### Step 1: Project Bootstrap + Route Discovery
- **Branch**: `feature/runtime-bootstrap`
- **Files created/modified**: `package.json`, `src/server.js`, `src/route-discovery.js`
- **What to implement**: Runtime entrypoint skeleton, recursive file scan under `api/`, route normalization logic (remove extension, trim terminal `/index`), route definition model.
- **Requirements fulfilled**: `REQ-RTG-001`, `REQ-RTG-002`
- **Definition of Done**: `node --input-type=module -e "import { filePathToRoutePath } from './src/route-discovery.js'; console.log(filePathToRoutePath('api/users/index.js'))"` -> prints `/api/users`

### Step 2: Request/Response Adapters + Core Dispatch
- **Branch**: `feature/contract-dispatch`
- **Files created/modified**: `src/request-adapter.js`, `src/response-adapter.js`, `src/dispatcher.js`, `src/server.js`, `api/demo-ok.js`, `api/demo-warm.js`, `api/users/index.js`, `api/echo.js`, `api/no-content.js`, `api/fast.js`
- **What to implement**: Node->Web request adaptation, method export invocation, Web->Node response adaptation, warm module reuse behavior, and basic success-path route execution.
- **Requirements fulfilled**: `REQ-RTG-003`, `REQ-RTG-006`, `REQ-CON-001`, `REQ-CON-002`, `REQ-CON-003`, `REQ-CON-004`, `REQ-CON-005`
- **Definition of Done**: `node --input-type=module -e "import { startServer } from './src/server.js'; const s=await startServer(0); const p=s.address().port; const a=await fetch('http://127.0.0.1:'+p+'/api/demo-warm').then(r=>r.json()); const b=await fetch('http://127.0.0.1:'+p+'/api/demo-warm').then(r=>r.json()); console.log(a.count,b.count); s.close();"` -> prints `1 2`

### Step 3: Error Mapping + Timeout Enforcement
- **Branch**: `feature/runtime-controls`
- **Files created/modified**: `src/error-handler.js`, `src/dispatcher.js`, `src/server.js`, `api/demo-error.js`, `api/demo-timeout.js`, `api/bad-return.js`
- **What to implement**: 404/405 mapping, `Allow` header generation, invalid return validation, thrown/rejected mapping, fixed 3000ms timeout mapping, and canonical runtime JSON error body.
- **Requirements fulfilled**: `REQ-RTG-004`, `REQ-RTG-005`, `REQ-CON-006`, `REQ-RCV-001`, `REQ-RCV-002`, `REQ-RCV-003`, `REQ-RCV-004`, `REQ-RCV-005`
- **Definition of Done**: `node --input-type=module -e "import { startServer } from './src/server.js'; const s=await startServer(0); const p=s.address().port; const x=await fetch('http://127.0.0.1:'+p+'/api/missing'); const y=await fetch('http://127.0.0.1:'+p+'/api/demo-ok',{method:'POST'}); const z=await fetch('http://127.0.0.1:'+p+'/api/demo-error'); const t=await fetch('http://127.0.0.1:'+p+'/api/demo-timeout'); console.log(x.status,y.status,z.status,t.status); s.close();"` -> prints `404 405 500 504`

### Step 4: Automated E2E Suite
- **Branch**: `feature/e2e-suite`
- **Files created/modified**: `test/e2e/runtime-harness.js`, `test/e2e/runtime.e2e.test.js`, `package.json`, `package-lock.json`
- **What to implement**: Runtime test harness, scenario-aligned HTTP tests, `npm test` script, assertions for routing, contract passthrough, runtime errors, timeout, and warm reuse.
- **Requirements fulfilled**: `REQ-RCV-006`, `REQ-RCV-007`
- **Definition of Done**: `npm test` -> test report shows all tests passing and exit code is `0`

## 8. Demo Functions
| Route | File | Behavior | Requirements validated |
|---|---|---|---|
| `/api/demo-ok` | `api/demo-ok.js` | Returns 200 success response | `REQ-RTG-001`, `REQ-RTG-003`, `REQ-RCV-005` |
| `/api/demo-error` | `api/demo-error.js` | Throws error to validate exception mapping | `REQ-RCV-003`, `REQ-RCV-004`, `REQ-RCV-005` |
| `/api/demo-timeout` | `api/demo-timeout.js` | Sleeps beyond 3000ms and triggers 504 mapping | `REQ-RCV-001`, `REQ-RCV-002`, `REQ-RCV-004`, `REQ-RCV-005` |
| `/api/demo-warm` | `api/demo-warm.js` | Module-level counter increments across calls in one process | `REQ-RTG-006`, `REQ-RCV-005` |

## 9. Test Plan
- Run tests with `npm test`.
- Tests are true E2E: spin up runtime on an ephemeral port, issue HTTP requests, assert HTTP status/headers/body and error payload contract.
- Coverage by scenario:

| SPEC Scenario | E2E assertion focus |
|---|---|
| 6.1 GET Route Dispatch from File Mapping | `/api/demo-ok` returns expected 200 body |
| 6.2 Nested Index Route Mapping | `api/users/index.js` resolves to `/api/users` |
| 6.3 Unknown Route Returns 404 | Missing route returns `ROUTE_NOT_FOUND` JSON |
| 6.4 Method Not Allowed Returns 405 | Unsupported method returns 405 + `Allow` |
| 6.5 Warm Module Reuse Across Invocations | `/api/demo-warm` returns count 1 then 2 |
| 6.6 Request and Response Contract Passthrough | `/api/echo` preserves method/url/headers/body, response status/headers/body |
| 6.7 Empty Body Handling for GET | `/api/no-content` sees empty body and returns 204 |
| 6.8 Non-Response Handler Return Value | `/api/bad-return` returns `INVALID_HANDLER_RESPONSE` |
| 6.9 Invocation Completes Within Timeout Budget | `/api/fast` succeeds and does not timeout |
| 6.10 Invocation Timeout Mapping | `/api/demo-timeout` returns `INVOCATION_TIMEOUT` with 504 |
| 6.11 Handler Exception Mapping | `/api/demo-error` returns `HANDLER_EXCEPTION` with 500 |
| 6.12 End-to-End Validation Command Pass Case | Full `npm test` suite passes with exit code 0 |

## 10. Git Conventions in Implementation Plan
- Each step is executed on its own feature branch (`feature/...`).
- Commits follow `type(scope): subject` format.
- Commit body includes `Fulfills: REQ-XX-NNN` for traceability.
- Each feature branch is pushed after commits and merged with `--no-ff`.

## 11. Design-Document Quality Checklist
- [x] Every requirement (REQ-RTG, REQ-CON, REQ-RCV) is covered by at least one module.
- [x] Every requirement appears in at least one implementation step Fulfills list.
- [x] Every implementation step has a runnable Definition of Done command with expected output.
- [x] File structure includes source files, demo functions, test files, and config files.
- [x] Implementation steps are ordered by dependency (no forward references).
- [x] Data flow description matches module responsibilities.
- [x] No designed module exists without requirement traceability.
