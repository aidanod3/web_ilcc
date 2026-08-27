const pino = require('pino');
const config = require('./config');

/* Pretty output in dev only, and only if pino-pretty is actually installed
   (it's a devDependency — absent in the production image). */
let transport;
if (!config.isProd) {
  try {
    require.resolve('pino-pretty');
    transport = { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } };
  } catch { /* fall back to JSON */ }
}

const logger = pino({
  level: config.logLevel,
  base: { service: 'ilcc', version: config.version },
  ...(transport ? { transport } : {}),
});

module.exports = logger;
