import { createRuntimeErrorResponse } from './error-handler.js';

const INVOCATION_TIMEOUT_MS = 3000;

class InvocationTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Invocation exceeded ${timeoutMs}ms timeout`);
    this.name = 'InvocationTimeoutError';
  }
}

function methodToHandler(method, routeDefinition) {
  return routeDefinition?.module?.[method];
}

function methodNotAllowedResponse(method, routePath, routeDefinition) {
  const allowValue = routeDefinition.supportedMethods.join(', ');

  return createRuntimeErrorResponse(
    'METHOD_NOT_ALLOWED',
    `Method ${method} not supported for ${routePath}`,
    { Allow: allowValue }
  );
}

function routeNotFoundResponse(routePath) {
  return createRuntimeErrorResponse(
    'ROUTE_NOT_FOUND',
    `No function route for ${routePath}`
  );
}

async function invokeWithTimeout(handler, webRequest) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new InvocationTimeoutError(INVOCATION_TIMEOUT_MS));
    }, INVOCATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([Promise.resolve(handler(webRequest)), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function dispatchRequest(webRequest, routeMap) {
  const requestUrl = new URL(webRequest.url);
  const routePath = requestUrl.pathname;
  const method = webRequest.method.toUpperCase();
  const routeDefinition = routeMap.get(routePath);

  if (!routeDefinition) {
    return routeNotFoundResponse(routePath);
  }

  const handler = methodToHandler(method, routeDefinition);
  if (typeof handler !== 'function') {
    return methodNotAllowedResponse(method, routePath, routeDefinition);
  }

  try {
    const handlerResult = await invokeWithTimeout(handler, webRequest);
    if (!(handlerResult instanceof Response)) {
      return createRuntimeErrorResponse(
        'INVALID_HANDLER_RESPONSE',
        'Handler must return a Response object'
      );
    }

    return handlerResult;
  } catch (error) {
    if (error instanceof InvocationTimeoutError) {
      return createRuntimeErrorResponse('INVOCATION_TIMEOUT', error.message);
    }

    const message = error instanceof Error ? error.message : 'Unknown handler error';
    return createRuntimeErrorResponse('HANDLER_EXCEPTION', message);
  }
}
