const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const http = require("node:http");

const config = getDefaultConfig(__dirname);
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

module.exports = withNativeWind(config, { input: "./global.css" });
