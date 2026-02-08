function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function GET() {
  await delay(5000);
  return new Response('too-late', { status: 200 });
}
