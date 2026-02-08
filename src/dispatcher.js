function methodToHandler(method, routeDefinition) {
  return routeDefinition?.module?.[method];
}

export async function dispatchRequest(webRequest, routeMap) {
  const requestUrl = new URL(webRequest.url);
  const routePath = requestUrl.pathname;
  const method = webRequest.method.toUpperCase();
  const routeDefinition = routeMap.get(routePath);

  if (!routeDefinition) {
    return new Response('Not Found', { status: 404 });
  }

  const handler = methodToHandler(method, routeDefinition);
  if (typeof handler !== 'function') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const handlerResult = await handler(webRequest);
    if (!(handlerResult instanceof Response)) {
      return new Response('Invalid handler response', { status: 500 });
    }

    return handlerResult;
  } catch {
    return new Response('Handler exception', { status: 500 });
  }
}
