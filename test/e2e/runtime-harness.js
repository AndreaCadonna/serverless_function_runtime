import { startServer } from '../../src/server.js';

export async function createRuntimeHarness() {
  const server = await startServer(0);
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Server did not bind to a TCP address');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    request(pathname, options) {
      return fetch(new URL(pathname, baseUrl), options);
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}
