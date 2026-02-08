import { Buffer } from 'node:buffer';

export async function writeWebResponse(webResponse, nodeResponse) {
  nodeResponse.statusCode = webResponse.status;

  for (const [headerName, headerValue] of webResponse.headers.entries()) {
    nodeResponse.setHeader(headerName, headerValue);
  }

  if (webResponse.body === null) {
    nodeResponse.end();
    return;
  }

  const responseBody = Buffer.from(await webResponse.arrayBuffer());
  nodeResponse.end(responseBody);
}
