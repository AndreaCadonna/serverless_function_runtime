# RESEARCH.md — Serverless Function Runtime (Mini-Vercel Functions)

## 1. Problem Statement
Modern teams use serverless functions to ship backend logic quickly without managing long-running servers. Instead of provisioning VMs, configuring process managers, and operating autoscaling infrastructure, developers write small request handlers that execute on demand. This model reduces operational overhead for APIs, webhooks, lightweight backend endpoints, and compute bursts.

A “mini Vercel Functions” runtime solves the local platform problem: how to map HTTP requests to function files, invoke handlers with a stable contract, and return responses predictably. Public platform docs show this contract clearly: Vercel functions map from files to endpoints and run handler code in response to requests; AWS Lambda exposes a runtime API loop (`next` event -> handler -> response); Cloudflare Workers uses a request handler (`fetch`) invoked per request in isolated contexts.

Typical users are framework authors, platform engineers, and developers building internal tooling who need to understand function-runtime mechanics, not just consume a hosted platform. For this project, the target user is an AI implementation agent: it needs a small but complete runtime model that demonstrates routing, invocation, and response handling end-to-end.

This belongs to the serverless/FaaS runtime domain. The core domain challenge is translating raw HTTP traffic into deterministic function execution while preserving statelessness at the contract level and tolerating warm reuse at the process level.

## 2. Core Principle
The single fundamental mechanism is **request-to-function dispatch via a strict invocation contract**: resolve an incoming HTTP request to a function entrypoint, call the handler with a normalized request object, and translate the handler result into an HTTP response.

Everything else (autoscaling, regions, auth, billing, observability stacks) is secondary. If we can prove file-to-route mapping, per-request invocation, and deterministic response serialization in one local runtime process, we have demonstrated the essential mechanism behind serverless functions.

## 3. Key Concepts
| Concept | Definition | Relevance to Our Build |
|---------|-----------|----------------------|
| Serverless Function | Small unit of backend code executed on demand per request/event. | Primary execution unit we dispatch to. |
| Invocation | One execution of a function for one request/event. | Runtime loop is built around invocation handling. |
| Handler Contract | Required function signature and return format. | Defines how runtime calls user code and validates output. |
| File-based Routing | Mapping file paths (for example `api/hello.ts`) to URL paths (`/api/hello`). | Core mechanism for endpoint discovery. |
| Runtime Adapter | Layer that converts transport objects into handler inputs/outputs. | Needed to bridge Node HTTP and Web `Request/Response`. |
| Warm Start | Reuse of already-initialized runtime/function state between invocations. | We intentionally allow module cache reuse in-process. |
| Cold Start | First invocation after initialization/idle period requiring setup work. | Helps define simple latency behavior in this experiment. |
| Statelessness (Contract-level) | Handler behavior should not require sticky in-memory state to be correct. | Keeps design deterministic and serverless-like. |
| Timeout Budget | Maximum allowed execution time per invocation. | Minimal safeguard to prevent hung handlers. |
| Isolation Boundary | How safely one function execution is separated from others (process, container, isolate, VM). | Important trade-off; we intentionally choose minimal isolation. |

## 4. Existing Approaches
### 4.1 Process-per-request (CGI/watchdog style)
- **How it works**: An HTTP front process receives a request and forks/spawns a fresh function process for each invocation.
- **Pros**: Strong isolation and simple mental model; easy cleanup per request.
- **Cons**: High startup overhead and poor latency under load due to repeated process creation.
- **Complexity**: Medium

### 4.2 Warm worker/container runtime (Lambda/OpenFaaS HTTP mode style)
- **How it works**: A long-lived worker runtime receives invocations, calls handlers repeatedly, and reuses initialized state when possible.
- **Pros**: Better latency and throughput from warm reuse; simpler than full orchestration in local mode.
- **Cons**: Weaker isolation unless combined with containers/microVMs; requires timeout/error controls.
- **Complexity**: Low

### 4.3 Isolate-based runtime (Workers/workerd style)
- **How it works**: Requests execute inside lightweight language isolates with fast startup and sandboxed memory boundaries.
- **Pros**: Excellent startup performance and multi-tenant efficiency.
- **Cons**: Harder to implement correctly; requires non-trivial runtime/sandbox internals.
- **Complexity**: High

### 4.4 Recommended Approach for This Experiment
Use **4.2 in simplified local form**: one Node.js HTTP server process with file-based route discovery and in-process handler invocation. This best demonstrates the core principle (dispatch contract) without introducing platform-level complexity.

This approach is intentionally not production-safe. It skips distributed scheduling and strong sandboxing, but it gives maximum learning value per line of code and is realistic for a single focused implementation session by an AI coding agent.

## 5. Scope Decision
### 5.1 What We Are Building (In Scope)
- **Filesystem route discovery**: Scan an `api/` directory and map files to HTTP endpoints.
- **Handler loading and dispatch**: Resolve function module per route and invoke based on HTTP method.
- **Request/response normalization**: Convert incoming Node HTTP request into Web `Request`-style input and serialize returned `Response` back to the client.
- **Basic runtime controls**: Per-invocation timeout and structured error-to-HTTP mapping (for example 500 on unhandled exceptions).
- **Warm execution behavior**: Reuse loaded modules between invocations within one process.
- **Local demo + tests**: Include example functions and tests proving end-to-end dispatch works.

### 5.2 What We Are NOT Building (Out of Scope)
- **Autoscaling and multi-instance scheduling**: production concern; not needed to prove dispatch mechanism.
- **Multi-region routing or edge distribution**: infrastructure concern; unrelated to local core principle.
- **Strong sandbox security (VM/isolate/microVM)**: large subsystem that would dominate project scope.
- **Authentication/authorization platform features**: application/platform policy layer, not runtime core.
- **Billing/quotas/tenant isolation**: operational concerns outside experimental goal.
- **Advanced observability stack (tracing backend, dashboards)**: complexity without changing core behavior.
- **Deployment packaging/build output compatibility**: useful later, but not required to prove invocation model.

### 5.3 What We Will Mock or Stub
- **Cloud control plane**: In production this schedules functions across workers/regions -> use one local process and fixed port.
- **Provisioning/autoscaler**: In production this allocates capacity on demand -> treat runtime as always available.
- **Persistent platform services**: In production functions call managed DB/queues/secrets -> use in-memory test doubles or hardcoded sample data.
- **Observability pipeline**: In production logs/metrics/traces are exported -> log structured events to stdout only.

## 6. Assumptions
- Implementation language/runtime is Node.js with TypeScript or modern JavaScript.
- Project goal is local experimentation, not deployment to Vercel/AWS/Cloudflare.
- Handler API will prioritize Web-standard style (`Request` -> `Response`) and method exports.
- Functions are discovered from an `api/` directory.
- Single-process runtime is acceptable; no multi-tenant untrusted code execution is required.
- One focused build session is the target, so scope excludes platform orchestration concerns.
- Public docs provide enough behavior to model; provider-internal schedulers are intentionally not replicated.

## 7. Open Questions
- None — sufficient information to proceed to specification.

## 8. References
- Vercel Docs: Using the Node.js Runtime with Vercel Functions — https://vercel.com/docs/functions/runtimes/node-js
- Vercel Docs: Runtimes — https://vercel.com/docs/functions/runtimes
- Vercel Docs: vercel dev — https://vercel.com/docs/cli/dev
- AWS Lambda Docs: Using the Lambda runtime API for custom runtimes — https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html
- AWS Lambda Docs: Understanding the Lambda execution environment lifecycle — https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- Cloudflare Workers Docs: How Workers works — https://developers.cloudflare.com/workers/reference/how-workers-works/
- OpenFaaS Docs: Watchdog architecture — https://docs.openfaas.com/architecture/watchdog/
- OpenFaaS of-watchdog (reference implementation) — https://github.com/openfaas/of-watchdog
- Knative Docs: Overview (Serving request flow) — https://knative.dev/docs/
- UC Berkeley Technical Report (2019): Cloud Programming Simplified: A Berkeley View on Serverless Computing — https://www2.eecs.berkeley.edu/Pubs/TechRpts/2019/EECS-2019-3.html
- USENIX HotCloud '16: Serverless Computation with OpenLambda — https://www.usenix.org/conference/hotcloud16/workshop-program/presentation/hendrickson
