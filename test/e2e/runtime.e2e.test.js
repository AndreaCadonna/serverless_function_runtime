import assert from 'node:assert/strict';
import test from 'node:test';

import { createRuntimeHarness } from './runtime-harness.js';

async function withHarness(runAssertions) {
  const harness = await createRuntimeHarness();

  try {
    await runAssertions(harness);
  } finally {
    await harness.close();
  }
}

test('dispatches GET /api/demo-ok from file mapping', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/demo-ok');
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload, { message: 'demo-ok' });
  });
});

test('maps api/users/index.js to /api/users', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/users');
    const payload = await response.text();

    assert.equal(response.status, 200);
    assert.equal(payload, 'users-index');
  });
});

test('returns 404 ROUTE_NOT_FOUND for unknown route', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/missing');
    const payload = await response.json();

    assert.equal(response.status, 404);
    assert.equal(payload.errorCode, 'ROUTE_NOT_FOUND');
    assert.equal(typeof payload.message, 'string');
    assert.notEqual(payload.message.length, 0);
  });
});

test('returns 405 METHOD_NOT_ALLOWED with Allow header', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/demo-ok', { method: 'POST' });
    const payload = await response.json();

    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET');
    assert.equal(payload.errorCode, 'METHOD_NOT_ALLOWED');
  });
});

test('reuses warm module state on /api/demo-warm', async () => {
  await withHarness(async (harness) => {
    const first = await harness.request('/api/demo-warm');
    const second = await harness.request('/api/demo-warm');

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.deepEqual(await first.json(), { count: 1 });
    assert.deepEqual(await second.json(), { count: 2 });
  });
});

test('preserves request and response contract on /api/echo', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/echo', {
      method: 'POST',
      headers: {
        'x-client-id': 'abc-123',
        'content-type': 'text/plain'
      },
      body: 'ping=1'
    });
    const payload = await response.text();

    assert.equal(response.status, 201);
    assert.equal(response.headers.get('x-echo-method'), 'POST');
    assert.equal(response.headers.get('x-echo-path'), '/api/echo');
    assert.equal(response.headers.get('x-echo-client-id'), 'abc-123');
    assert.equal(response.headers.get('content-type'), 'text/plain');
    assert.equal(payload, 'ping=1');
  });
});

test('handles empty GET request body on /api/no-content', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/no-content');
    const payload = await response.text();

    assert.equal(response.status, 204);
    assert.equal(payload, '');
  });
});

test('maps non-Response handler result to INVALID_HANDLER_RESPONSE', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/bad-return');
    const payload = await response.json();

    assert.equal(response.status, 500);
    assert.equal(payload.errorCode, 'INVALID_HANDLER_RESPONSE');
    assert.equal(typeof payload.message, 'string');
    assert.notEqual(payload.message.length, 0);
  });
});

test('allows fast invocation under timeout budget on /api/fast', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/fast');
    const payload = await response.text();

    assert.equal(response.status, 200);
    assert.equal(payload, 'fast');
  });
});

test('maps invocation timeout to INVOCATION_TIMEOUT', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/demo-timeout');
    const payload = await response.json();

    assert.equal(response.status, 504);
    assert.equal(payload.errorCode, 'INVOCATION_TIMEOUT');
    assert.match(payload.message, /3000ms timeout/);
  });
});

test('maps thrown handler errors to HANDLER_EXCEPTION', async () => {
  await withHarness(async (harness) => {
    const response = await harness.request('/api/demo-error');
    const payload = await response.json();

    assert.equal(response.status, 500);
    assert.equal(payload.errorCode, 'HANDLER_EXCEPTION');
    assert.match(payload.message, /boom/);
  });
});
