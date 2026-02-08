export async function POST(request) {
  const body = await request.text();
  const requestUrl = new URL(request.url);
  const clientId = request.headers.get('x-client-id') ?? '';

  return new Response(body, {
    status: 201,
    headers: {
      'content-type': 'text/plain',
      'x-echo-method': request.method,
      'x-echo-path': requestUrl.pathname,
      'x-echo-client-id': clientId
    }
  });
}
