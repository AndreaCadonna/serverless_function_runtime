export async function POST(request) {
  const body = await request.text();

  return new Response(body, {
    status: 201,
    headers: {
      'content-type': 'text/plain',
      'x-echo-method': request.method
    }
  });
}
