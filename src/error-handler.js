const ERROR_DEFINITIONS = {
  ROUTE_NOT_FOUND: { status: 404 },
  METHOD_NOT_ALLOWED: { status: 405 },
  HANDLER_EXCEPTION: { status: 500 },
  INVALID_HANDLER_RESPONSE: { status: 500 },
  INVOCATION_TIMEOUT: { status: 504 }
};

export function createRuntimeErrorResponse(errorCode, message, extraHeaders = {}) {
  const definition = ERROR_DEFINITIONS[errorCode];
  if (!definition) {
    throw new Error(`Unsupported runtime error code: ${errorCode}`);
  }

  const headers = new Headers(extraHeaders);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new Response(JSON.stringify({ errorCode, message }), {
    status: definition.status,
    headers
  });
}
