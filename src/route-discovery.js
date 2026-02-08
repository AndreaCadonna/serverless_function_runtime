import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SUPPORTED_METHOD_EXPORTS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS'
];

export function filePathToRoutePath(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const withoutExtension = normalizedPath.replace(/\.[^.]+$/, '');
  const withoutTerminalIndex = withoutExtension.replace(/\/index$/, '');

  if (withoutTerminalIndex === 'api') {
    return '/api';
  }

  return `/${withoutTerminalIndex}`;
}

async function collectFunctionFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFunctionFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && /\.(?:js|mjs|cjs)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function toWorkspaceRelativePath(absolutePath) {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
}

function extractSupportedMethods(functionModule) {
  return SUPPORTED_METHOD_EXPORTS.filter((method) => {
    return typeof functionModule[method] === 'function';
  });
}

export async function discoverRoutes(apiDirectory = 'api') {
  const absoluteApiDirectory = path.resolve(process.cwd(), apiDirectory);
  const routeMap = new Map();
  const functionFiles = await collectFunctionFiles(absoluteApiDirectory);

  for (const absoluteFilePath of functionFiles) {
    const sourceFilePath = toWorkspaceRelativePath(absoluteFilePath);
    const routePath = filePathToRoutePath(sourceFilePath);
    const functionModule = await import(pathToFileURL(absoluteFilePath).href);
    const supportedMethods = extractSupportedMethods(functionModule);

    if (routeMap.has(routePath)) {
      throw new Error(`Duplicate route detected for ${routePath}`);
    }

    routeMap.set(routePath, {
      routePath,
      sourceFilePath,
      module: functionModule,
      supportedMethods
    });
  }

  return routeMap;
}
