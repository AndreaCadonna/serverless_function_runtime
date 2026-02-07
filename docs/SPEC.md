# SPEC.md — Serverless Function Runtime (Mini-Vercel Functions)

## 1. Overview

This system runs a local serverless runtime that maps files in `api/` to HTTP endpoints, dispatches each request to the matching function handler through a strict `Request` to `Response` contract, and returns deterministic HTTP responses including timeout and error handling. It demonstrates request-to-function dispatch in one local process and explicitly excludes autoscaling, multi-region routing, strong sandbox isolation, authentication, billing, and deployment packaging concerns.

## 2. Goals and Non-Goals

### 2.1 Goals
- **G1**: Demonstrate deterministic file-based HTTP route discovery from `api/`.
- **G2**: Demonstrate per-request handler invocation using HTTP method-based dispatch.
- **G3**: Demonstrate transport normalization from incoming HTTP request data to handler `Request` input and from handler `Response` output to outgoing HTTP response.
- **G4**: Demonstrate runtime safeguards through per-invocation timeout and structured error-to-HTTP mapping.
- **G5**: Demonstrate warm execution behavior through module reuse inside one running process.
- **G6**: Provide local demo functions and automated end-to-end tests that prove the dispatch model.

### 2.2 Non-Goals
- **NG1**: Autoscaling and multi-instance scheduling are out of scope because this experiment proves dispatch behavior in one local process.
- **NG2**: Multi-region or edge routing is out of scope because geographic distribution is not required to prove the core mechanism.
- **NG3**: Strong sandbox security (VM, isolate, microVM) is out of scope because isolation internals are a separate subsystem.
- **NG4**: Platform authentication and authorization are out of scope because policy features do not change dispatch mechanics.
- **NG5**: Billing, quotas, and tenant isolation are out of scope because operational platform concerns are outside this experiment.
- **NG6**: Advanced observability backends are out of scope; only local structured stdout logging is required.
- **NG7**: Deployment packaging compatibility with hosted providers is out of scope because local runtime behavior is the only target.

## 3. Core Features and Behavioral Requirements

### 3.1 Routing and Dispatch

This feature defines how function files become HTTP routes and how incoming requests are dispatched to method-specific handlers.

- **REQ-RTG-001**: The system shall discover function files located under the `api/` directory and expose each discovered file as an HTTP route under `/api/`.
- **REQ-RTG-002**: The system shall derive route paths by removing the file extension from the discovered file path and removing a terminal `/index` segment when present.
- **REQ-RTG-003**: The system shall invoke the handler export whose name equals the incoming HTTP method for requests that match an existing route and supported method.
- **REQ-RTG-004**: The system shall return HTTP `404` with a JSON error payload when the request path does not match any discovered route.
- **REQ-RTG-005**: The system shall return HTTP `405` with an `Allow` header listing supported methods when the route exists and the requested HTTP method is not exported.
- **REQ-RTG-006**: The system shall reuse the already loaded function module for repeated invocations of the same route within one running runtime process.

### 3.2 Invocation Contract Normalization

This feature defines the strict request and response contract between HTTP transport and function handlers.

- **REQ-CON-001**: The system shall provide each invoked handler a Web-standard `Request` object with method, URL, and headers equal to the incoming HTTP request values.
- **REQ-CON-002**: The system shall provide each invoked handler a `Request` body stream containing the exact incoming HTTP request body bytes.
- **REQ-CON-003**: The system shall return the handler `Response` status code to the client without modification.
- **REQ-CON-004**: The system shall return handler `Response` headers to the client without modification.
- **REQ-CON-005**: The system shall return handler `Response` body bytes to the client without modification.
- **REQ-CON-006**: The system shall return HTTP `500` with a JSON error payload when a handler returns a value that is not a Web-standard `Response` object.

### 3.3 Runtime Controls and Validation Assets

This feature defines timeout and error behavior plus required local demonstration and validation artifacts.

- **REQ-RCV-001**: The system shall enforce a timeout budget of `3000` milliseconds for every invocation.
- **REQ-RCV-002**: The system shall return HTTP `504` with a JSON error payload when invocation execution time exceeds the timeout budget.
- **REQ-RCV-003**: The system shall return HTTP `500` with a JSON error payload when a handler throws an exception or returns a rejected promise.
- **REQ-RCV-004**: The system shall format every runtime-generated error response body as JSON with required fields `errorCode` (`string`) and `message` (`string`).
- **REQ-RCV-005**: The system shall include demo function routes `/api/demo-ok`, `/api/demo-error`, `/api/demo-timeout`, and `/api/demo-warm`.
- **REQ-RCV-006**: The system shall include an automated end-to-end test suite runnable through the command `npm test`.
- **REQ-RCV-007**: The system shall make `npm test` exit with status code `0` when all end-to-end tests pass.

## 4. Data Model

### 4.1 Entities

#### RouteDefinition

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| routePath | string | required, non-empty, starts with `/api/`, unique | Public HTTP path for a discovered function route. |
| sourceFilePath | string | required, non-empty, starts with `api/`, unique | Filesystem path of the function file used for this route. |
| supportedMethods | list of enum([GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS]) | required, at least 1 value, unique values only | HTTP methods exported by the function module. |

#### InvocationRequest

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| method | enum([GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS]) | required | Incoming HTTP method for one invocation. |
| url | string | required, non-empty, absolute URL format | Request URL passed to handler input. |
| headers | map of string → list of string | required, key count >= 0 | Incoming headers passed to handler input. |
| body | bytes | required, empty bytes allowed | Incoming request body bytes passed to handler input. |
| route | RouteDefinition reference | required | Route selected for this invocation. |
| receivedAt | datetime | required | Timestamp when runtime accepted the request. |

#### InvocationResponse

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| status | integer | required, range 100-599 | HTTP status returned from handler `Response`. |
| headers | map of string → list of string | required, key count >= 0 | HTTP response headers sent to client. |
| body | bytes | required, empty bytes allowed | HTTP response body bytes sent to client. |
| route | RouteDefinition reference | required | Route that produced this response. |

#### ErrorResponse

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| errorCode | enum([ROUTE_NOT_FOUND, METHOD_NOT_ALLOWED, INVALID_HANDLER_RESPONSE, HANDLER_EXCEPTION, INVOCATION_TIMEOUT]) | required | Machine-readable runtime error identifier. |
| message | string | required, non-empty | Human-readable error detail. |
| httpStatus | enum([404, 405, 500, 504]) | required | HTTP status used for this error response. |

#### DemoFunction

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| routePath | string | required, enum([/api/demo-ok, /api/demo-error, /api/demo-timeout, /api/demo-warm]) | Demo route path included for local validation. |
| behaviorType | enum([success, throw_error, timeout, warm_state]) | required | Behavior class demonstrated by the demo route. |

#### ValidationRun

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| command | string | required, exact value `npm test` | Command used to execute the end-to-end validation suite. |
| exitCode | integer | required, minimum 0 | Process exit code from validation execution. |
| passed | boolean | required | Whether the validation suite passed. |

### 4.2 Relationships

- RouteDefinition → InvocationRequest: one-to-many. One discovered route can receive many invocations.
- InvocationRequest → InvocationResponse: one-to-one. A successful invocation produces one response.
- InvocationRequest → ErrorResponse: one-to-one. A failed invocation produces one error response.
- RouteDefinition → DemoFunction: zero-to-one. A route can be one of the defined demo routes.
- ValidationRun → DemoFunction: one-to-many. One validation run exercises multiple demo routes.

### 4.3 Data Lifecycle

- **Persisted**: Function files in `api/`, including required demo functions, and automated end-to-end test files are persisted in the project workspace.
- **Computed**: RouteDefinition records and method allow-lists are computed from function files during runtime startup.
- **Transient**: InvocationRequest, InvocationResponse, ErrorResponse, timeout timers, and in-process loaded module state exist only while the runtime process is running.

## 5. Interface Contracts

### 5.1 Interface Type

REST API.
This experiment demonstrates HTTP request-to-function dispatch, so the primary external contract is HTTP endpoint invocation.

### 5.2 Dynamic Function Invocation Endpoint

- **Signature**: `[METHOD] /api/{route_segments}`
- **Input**:
  - `METHOD` (enum([GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS])): HTTP method for invocation. Required.
  - `route_segments` (string): Path segment sequence after `/api/`. Required, non-empty.
  - `headers` (map of string → list of string): HTTP request headers. Optional, default empty map.
  - `body` (optional bytes): HTTP request body bytes. Optional, default empty bytes.
- **Behavior**: The system resolves `{route_segments}` from discovered routes, dispatches to the method export, converts request input to handler `Request`, enforces timeout, and returns handler `Response` or runtime error mapping. Fulfills REQ-RTG-001, REQ-RTG-002, REQ-RTG-003, REQ-RTG-004, REQ-RTG-005, REQ-RTG-006, REQ-CON-001, REQ-CON-002, REQ-CON-003, REQ-CON-004, REQ-CON-005, REQ-CON-006, REQ-RCV-001, REQ-RCV-002, REQ-RCV-003, REQ-RCV-004, REQ-RCV-005.
- **Output**: Raw HTTP response derived from handler `Response` on success.
  ```http
  HTTP/1.1 200 OK
  content-type: application/json
  x-demo: ok

  {"message":"demo-ok"}
  ```
- **Errors**:
  - `No matching route`: HTTP `404` with JSON body `{"errorCode":"ROUTE_NOT_FOUND","message":"No function route for /api/<path>"}`.
  - `Route exists but method export missing`: HTTP `405` with `Allow` header containing supported methods and JSON body `{"errorCode":"METHOD_NOT_ALLOWED","message":"Method <METHOD> not supported for /api/<path>"}`.
  - `Handler return value is not Response`: HTTP `500` with JSON body `{"errorCode":"INVALID_HANDLER_RESPONSE","message":"Handler must return a Response object"}`.
  - `Handler throws or rejects`: HTTP `500` with JSON body `{"errorCode":"HANDLER_EXCEPTION","message":"<error message>"}`.
  - `Invocation exceeds 3000 ms`: HTTP `504` with JSON body `{"errorCode":"INVOCATION_TIMEOUT","message":"Invocation exceeded 3000ms timeout"}`.

### 5.3 End-to-End Validation Command

- **Signature**: `npm test`
- **Input**:
  - `command` (string): Fixed command text. Required. Exact value `npm test`.
- **Behavior**: The system executes the automated end-to-end suite against the local runtime and reports pass or fail status. Fulfills REQ-RCV-006 and REQ-RCV-007.
- **Output**: Console test report plus process exit code.
  ```text
  PASS e2e/runtime.e2e.test.js
    ✓ dispatches GET /api/demo-ok
    ✓ maps thrown handler errors to 500
    ✓ maps timed-out handler to 504
    ✓ demonstrates warm module reuse on /api/demo-warm

  Test Suites: 1 passed, 1 total
  Tests: 4 passed, 4 total
  Exit Code: 0
  ```
- **Errors**:
  - `Any test assertion fails`: Console report marks failing test case and process exit code is non-zero.
  - `Required demo route test is missing`: Console report marks missing coverage failure and process exit code is non-zero.

## 6. Behavior Scenarios

### 6.1 GET Route Dispatch from File Mapping — Routing and Dispatch

**Validates**: REQ-RTG-001, REQ-RTG-002, REQ-RTG-003, REQ-RCV-005

**Given**:
- Function file `api/demo-ok.js` exists and exports `GET(request)` returning `Response.json({"message":"demo-ok"}, {status: 200})`.
- Runtime process is running.

**When**:
- Client sends `GET /api/demo-ok` with header `accept: application/json`.

**Then**:
- Response status is `200`.
- Response body is `{"message":"demo-ok"}`.
- Response corresponds to the file `api/demo-ok.js` mapped to route `/api/demo-ok`.

### 6.2 Nested Index Route Mapping — Routing and Dispatch

**Validates**: REQ-RTG-001, REQ-RTG-002, REQ-RTG-003

**Given**:
- Function file `api/users/index.js` exists and exports `GET(request)` returning body `users-index` with status `200`.
- Runtime process is running.

**When**:
- Client sends `GET /api/users`.

**Then**:
- Response status is `200`.
- Response body is `users-index`.
- Route `/api/users` resolves from file path `api/users/index.js`.

### 6.3 Unknown Route Returns 404 — Routing and Dispatch

**Validates**: REQ-RTG-004, REQ-RCV-004

**Given**:
- Runtime process is running.
- No file exists for route `/api/missing`.

**When**:
- Client sends `GET /api/missing`.

**Then**:
- Response status is `404`.
- Response body is JSON with `errorCode` equal to `ROUTE_NOT_FOUND`.
- Response body contains a non-empty `message` string.

### 6.4 Method Not Allowed Returns 405 — Routing and Dispatch

**Validates**: REQ-RTG-005, REQ-RCV-004

**Given**:
- Function file `api/demo-ok.js` exists and exports only `GET(request)`.
- Runtime process is running.

**When**:
- Client sends `POST /api/demo-ok` with body `{"x":1}`.

**Then**:
- Response status is `405`.
- Response header `Allow` is `GET`.
- Response body is JSON with `errorCode` equal to `METHOD_NOT_ALLOWED`.

### 6.5 Warm Module Reuse Across Invocations — Routing and Dispatch

**Validates**: REQ-RTG-006, REQ-RTG-003, REQ-RCV-005

**Given**:
- Function file `api/demo-warm.js` has module-level variable `count` initialized to `0`.
- Exported `GET(request)` increments `count` and returns JSON `{"count": <value>}`.
- Runtime process is running.

**When**:
- Client sends `GET /api/demo-warm` twice in sequence to the same runtime process.

**Then**:
- First response body is `{"count":1}`.
- Second response body is `{"count":2}`.
- Both responses are `200`.

### 6.6 Request and Response Contract Passthrough — Invocation Contract Normalization

**Validates**: REQ-CON-001, REQ-CON-002, REQ-CON-003, REQ-CON-004, REQ-CON-005

**Given**:
- Function file `api/echo.js` exports `POST(request)` that reads `request.text()` and returns `new Response(body, { status: 201, headers: { "content-type": "text/plain", "x-echo-method": request.method } })`.
- Runtime process is running.

**When**:
- Client sends `POST /api/echo` with header `x-client-id: abc-123` and body bytes `ping=1`.

**Then**:
- Handler receives `Request.method` equal to `POST`.
- Handler receives URL ending with `/api/echo`.
- Handler receives header `x-client-id` with value `abc-123`.
- Client receives status `201`.
- Client receives header `x-echo-method: POST`.
- Client receives body `ping=1`.

### 6.7 Empty Body Handling for GET — Invocation Contract Normalization

**Validates**: REQ-CON-002, REQ-CON-003, REQ-CON-005

**Given**:
- Function file `api/no-content.js` exports `GET(request)` that returns status `204` when `await request.text()` is an empty string.
- Runtime process is running.

**When**:
- Client sends `GET /api/no-content` with no request body.

**Then**:
- Handler receives empty request body bytes.
- Response status is `204`.
- Response body is empty.

### 6.8 Non-Response Handler Return Value — Invocation Contract Normalization

**Validates**: REQ-CON-006, REQ-RCV-004

**Given**:
- Function file `api/bad-return.js` exports `GET(request)` that returns plain object `{"ok": true}`.
- Runtime process is running.

**When**:
- Client sends `GET /api/bad-return`.

**Then**:
- Response status is `500`.
- Response body is JSON with `errorCode` equal to `INVALID_HANDLER_RESPONSE`.
- Response body contains a non-empty `message` string.

### 6.9 Invocation Completes Within Timeout Budget — Runtime Controls and Validation Assets

**Validates**: REQ-RCV-001

**Given**:
- Function file `api/fast.js` exports `GET(request)` that waits `50` milliseconds then returns status `200` with body `fast`.
- Runtime process is running.

**When**:
- Client sends `GET /api/fast`.

**Then**:
- Response status is `200`.
- Response body is `fast`.
- No timeout error is returned.

### 6.10 Invocation Timeout Mapping — Runtime Controls and Validation Assets

**Validates**: REQ-RCV-001, REQ-RCV-002, REQ-RCV-004, REQ-RCV-005

**Given**:
- Function file `api/demo-timeout.js` exports `GET(request)` that waits `5000` milliseconds before returning.
- Runtime timeout budget is `3000` milliseconds.

**When**:
- Client sends `GET /api/demo-timeout`.

**Then**:
- Response status is `504`.
- Response body is JSON with `errorCode` equal to `INVOCATION_TIMEOUT`.
- Response body `message` states timeout budget exceeded.

### 6.11 Handler Exception Mapping — Runtime Controls and Validation Assets

**Validates**: REQ-RCV-003, REQ-RCV-004, REQ-RCV-005

**Given**:
- Function file `api/demo-error.js` exports `GET(request)` that throws `Error("boom")`.
- Runtime process is running.

**When**:
- Client sends `GET /api/demo-error`.

**Then**:
- Response status is `500`.
- Response body is JSON with `errorCode` equal to `HANDLER_EXCEPTION`.
- Response body `message` contains `boom`.

### 6.12 End-to-End Validation Command Pass Case — Runtime Controls and Validation Assets

**Validates**: REQ-RCV-006, REQ-RCV-007, REQ-RCV-005

**Given**:
- Demo routes `/api/demo-ok`, `/api/demo-error`, `/api/demo-timeout`, and `/api/demo-warm` exist.
- End-to-end tests invoke these routes over HTTP and assert dispatch, normalization, timeout, error mapping, and warm reuse.

**When**:
- `npm test` is executed from the project root.

**Then**:
- The test output reports all test cases as passed.
- Process exit code is `0`.

## 7. Technical Constraints

- **Language/Runtime**: Node.js with modern JavaScript or TypeScript.
- **Dependencies**: No required framework dependency; agent chooses minimal dependencies needed to satisfy the HTTP runtime contract and end-to-end testing.
- **Data Storage**: Function source files and tests in workspace filesystem; route map and loaded modules in process memory.
- **Mocked Components**: Components from RESEARCH.md Section 5.3 are represented with local substitutes.
  - Cloud control plane: Single local process on one fixed HTTP port.
  - Provisioning/autoscaler: Runtime treated as continuously available after startup.
  - Persistent platform services: Demo functions use hardcoded values or in-memory test doubles.
  - Observability pipeline: Structured events are written to stdout only.
- **Performance**: Performance optimization is not a concern for this experiment beyond enforcing the required per-invocation timeout behavior.
- **Security**: Strong sandbox security and multi-tenant hardening are not a concern for this experiment.

## 8. Deviations from Research

- **D1**: This spec sets a concrete timeout value of `3000` milliseconds to remove ambiguity in validation. RESEARCH.md requires a per-invocation timeout but does not define a value.
- **D2**: This spec names concrete demo routes and the validation command `npm test` to make the local demo-and-tests scope item executable as automated pass/fail checks.

## 9. Traceability Matrix

| Research Scope Item (Section 5.1) | Requirements | Interface Contracts | Scenarios |
|----------------------------------|--------------|-------------------|-----------|
| Filesystem route discovery: Scan an `api/` directory and map files to HTTP endpoints. | REQ-RTG-001, REQ-RTG-002 | 5.2 Dynamic Function Invocation Endpoint | 6.1, 6.2 |
| Handler loading and dispatch: Resolve function module per route and invoke based on HTTP method. | REQ-RTG-003, REQ-RTG-005 | 5.2 Dynamic Function Invocation Endpoint | 6.1, 6.4, 6.5 |
| Request/response normalization: Convert incoming Node HTTP request into Web `Request`-style input and serialize returned `Response` back to the client. | REQ-CON-001, REQ-CON-002, REQ-CON-003, REQ-CON-004, REQ-CON-005, REQ-CON-006 | 5.2 Dynamic Function Invocation Endpoint | 6.6, 6.7, 6.8 |
| Basic runtime controls: Per-invocation timeout and structured error-to-HTTP mapping. | REQ-RCV-001, REQ-RCV-002, REQ-RCV-003, REQ-RCV-004, REQ-RTG-004 | 5.2 Dynamic Function Invocation Endpoint | 6.3, 6.10, 6.11 |
| Warm execution behavior: Reuse loaded modules between invocations within one process. | REQ-RTG-006 | 5.2 Dynamic Function Invocation Endpoint | 6.5 |
| Local demo + tests: Include example functions and tests proving end-to-end dispatch works. | REQ-RCV-005, REQ-RCV-006, REQ-RCV-007 | 5.2 Dynamic Function Invocation Endpoint, 5.3 End-to-End Validation Command | 6.1, 6.5, 6.12 |
