import http from 'node:http';

import { dispatchRequest } from './dispatcher.js';
import { discoverRoutes } from './route-discovery.js';
import { createRuntimeErrorResponse } from './error-handler.js';
import { createWebRequest } from './request-adapter.js';
import { writeWebResponse } from './response-adapter.js';

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

export async function startServer(port = 3000) {
  const routeMap = await discoverRoutes('api');

  const server = http.createServer((incomingRequest, outgoingResponse) => {
    const host = incomingRequest.headers.host ?? '127.0.0.1';
    const origin = `http://${host}`;

    Promise.resolve()
      .then(async () => {
        const webRequest = await createWebRequest(incomingRequest, origin);
        const webResponse = await dispatchRequest(webRequest, routeMap);
        await writeWebResponse(webResponse, outgoingResponse);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Unhandled runtime error';
        const runtimeErrorResponse = createRuntimeErrorResponse('HANDLER_EXCEPTION', message);

        writeWebResponse(runtimeErrorResponse, outgoingResponse).catch(() => {
          if (!outgoingResponse.headersSent) {
            outgoingResponse.statusCode = 500;
            outgoingResponse.setHeader('content-type', 'application/json');
          }
          outgoingResponse.end(
            JSON.stringify({
              errorCode: 'HANDLER_EXCEPTION',
              message
            })
          );
        });
      });
  });

  server.routeMap = routeMap;
  await listen(server, port);
  return server;
}
