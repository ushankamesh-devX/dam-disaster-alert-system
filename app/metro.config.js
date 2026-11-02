const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const http = require("node:http");
const { installNativeWindChangeCompat } = require('./scripts/metro-nativewind-compat.cjs');

const config = getDefaultConfig(__dirname);
// Leave memory for the local API, Docker dependencies, and Android tooling.
config.maxWorkers = 2;
const existingEnhancer = config.server.enhanceMiddleware;
// Expo's tunnel forwards both the bundle and authenticated local API requests.
config.server.enhanceMiddleware = (middleware, server) => {
  const next = existingEnhancer ? existingEnhancer(middleware, server) : middleware;
  return (req, res, nextMiddleware) => {
    if (!req.url?.startsWith('/api/v1/')) return next(req, res, nextMiddleware);
    const upstream = http.request({
      hostname: '127.0.0.1', port: 8080, path: req.url, method: req.method,
      headers: { ...req.headers, host: 'localhost:8080' },
    }, (reply) => {
      res.writeHead(reply.statusCode || 502, reply.headers);
      reply.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Local DDAS backend is unavailable.' }));
    });
    req.pipe(upstream);
  };
};

const nativeWindConfig = withNativeWind(config, { input: "./global.css" });
const nativeWindEnhancer = nativeWindConfig.server.enhanceMiddleware;
nativeWindConfig.server.enhanceMiddleware = (middleware, server) => {
  const ready = server.getBundler().getBundler().getDependencyGraph().then(graph => {
    installNativeWindChangeCompat(graph._haste, nativeWindConfig.projectRoot);
  });
  const enhanced = nativeWindEnhancer(middleware, server);
  return (req, res, next) => { ready.then(() => enhanced(req, res, next)).catch(next); };
};
module.exports = nativeWindConfig;
