# Serverless Function Runtime

Local serverless runtime that maps files in `api/` to HTTP endpoints and dispatches requests using a strict Web `Request -> Response` contract.

## Project Scope

This project is intentionally scoped to a local, single-process runtime experiment:

- File-based route discovery from `api/`
- Method-based handler dispatch (`GET`, `POST`, etc.)
- Request/response passthrough with Web-standard APIs
- Runtime error mapping and fixed invocation timeout (`3000ms`)
- Demo routes and E2E validation via `npm test`

Out of scope: autoscaling, multi-region routing, strong sandbox isolation, auth, billing, and deployment packaging.

## Short Summary

The runtime discovers function files, exposes them under `/api/*`, invokes handler exports named after HTTP methods, and returns either handler responses or standardized runtime error responses.

## Documentation

For full details:

- Specification: `docs/SPEC.md`
- Technical design: `docs/DESIGN.md`
- Research notes: `docs/RESEARCH.md`
- Latest validation report: `docs/VALIDATION.md`
- Re-validation snapshot: `VALIDATION_REPORT.md`

## Setup

### Prerequisites

- Node.js 20+

### Install

```bash
npm install
```

## Running the Runtime Locally

There is no `npm start` script yet. Use the exported `startServer` helper directly:

```bash
node --input-type=module -e "import { startServer } from './src/server.js'; const s=await startServer(3000); console.log('Runtime listening on http://127.0.0.1:3000');"
```

Then call any route, for example:

```bash
curl http://127.0.0.1:3000/api/demo-ok
```

## Useful Commands

- Run full E2E suite:

```bash
npm test
```

- Quick smoke test for one scenario:

```bash
node --test --test-name-pattern "dispatches GET /api/demo-ok from file mapping" test/e2e/runtime.e2e.test.js
```

- Quick route normalization check:

```bash
node --input-type=module -e "import { filePathToRoutePath } from './src/route-discovery.js'; console.log(filePathToRoutePath('api/users/index.js'))"
```

- Quick warm-module behavior check:

```bash
node --input-type=module -e "import { startServer } from './src/server.js'; const s=await startServer(0); const p=s.address().port; const a=await fetch('http://127.0.0.1:'+p+'/api/demo-warm').then(r=>r.json()); const b=await fetch('http://127.0.0.1:'+p+'/api/demo-warm').then(r=>r.json()); console.log(a.count,b.count); s.close();"
```
