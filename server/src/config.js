/*
 * config.js — single place every env var is read and defaulted.
 * Import this instead of touching process.env elsewhere.
 */
require('dotenv').config();

const int  = (v, d) => (v === undefined || v === '' ? d : parseInt(v, 10));
const list = (v) => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);

const config = {
  env:        process.env.NODE_ENV || 'development',
  isProd:     process.env.NODE_ENV === 'production',
  port:       int(process.env.PORT, 3000),
  logLevel:   process.env.LOG_LEVEL || 'info',
  publicBase: (process.env.PUBLIC_BASE || '/').replace(/\/+$/, '') || '/',

  dataDir:      process.env.DATA_DIR || './data',
  dbPath:       process.env.DB_PATH || './data/ilcc.db',
  downloadsDir: process.env.DOWNLOADS_DIR || './data/downloads',

  trustedProxyCidrs: list(process.env.TRUSTED_PROXY_CIDR || '10.42.0.0/16,127.0.0.1/32'),
  hydraProxySecret:  process.env.HYDRA_PROXY_SECRET || '',
  seedAdmins:        list(process.env.SEED_ADMINS).map(e => e.toLowerCase()),

  maxCodeBytes:     int(process.env.MAX_CODE_BYTES, 65536),
  wsMaxPayload:     int(process.env.WS_MAX_PAYLOAD, 131072),
  sessionIdleMs:    int(process.env.SESSION_IDLE_MS, 300000),
  maxSessionsPerIp: int(process.env.MAX_SESSIONS_PER_IP, 4),
  graderTimeoutMs:  int(process.env.GRADER_TIMEOUT_MS, 5000),
  maxZipMb:         int(process.env.MAX_ZIP_MB, 50),

  version: require('../package.json').version,
  bootedAt: Date.now(),
};

module.exports = config;
