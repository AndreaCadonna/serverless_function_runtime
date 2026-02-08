import http from 'node:http';

import { discoverRoutes } from './route-discovery.js';

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

  const server = http.createServer((_request, response) => {
    response.statusCode = 501;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        message: 'Runtime initialized',
        routesDiscovered: routeMap.size
      })
    );
  });

  server.routeMap = routeMap;
  await listen(server, port);
  return server;
}
