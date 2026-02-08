let count = 0;

export function GET() {
  count += 1;
  return Response.json({ count }, { status: 200 });
}
