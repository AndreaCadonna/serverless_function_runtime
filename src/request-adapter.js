import { Buffer } from 'node:buffer';

async function readBodyBytes(incomingRequest) {
  const chunks = [];

  for await (const chunk of incomingRequest) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function toWebHeaders(incomingRequest) {
  const headers = new Headers();
  const rawHeaders = incomingRequest.rawHeaders ?? [];

  for (let index = 0; index < rawHeaders.length; index += 2) {
    const headerName = rawHeaders[index];
    const headerValue = rawHeaders[index + 1];
    if (typeof headerName === 'string' && typeof headerValue === 'string') {
      headers.append(headerName, headerValue);
    }
  }

  return headers;
}

export async function createWebRequest(incomingRequest, origin) {
  const method = (incomingRequest.method ?? 'GET').toUpperCase();
  const headers = toWebHeaders(incomingRequest);
  const bodyBytes = await readBodyBytes(incomingRequest);
  const url = new URL(incomingRequest.url ?? '/', origin);
  const init = { method, headers };

  if (!['GET', 'HEAD'].includes(method) && bodyBytes.length > 0) {
    init.body = bodyBytes;
  }

  return new Request(url, init);
}
