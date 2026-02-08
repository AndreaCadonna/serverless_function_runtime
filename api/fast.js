function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function GET() {
  await delay(50);
  return new Response('fast', { status: 200 });
}
