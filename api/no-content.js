export async function GET(request) {
  const body = await request.text();

  if (body === '') {
    return new Response(null, { status: 204 });
  }

  return new Response('unexpected request body', { status: 400 });
}
