/* Every test gets an isolated sqlite file + downloads dir, and a fixed proxy
   secret so requests can assert both the trusted and untrusted paths. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ilcc-test-'));
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.PUBLIC_BASE = '/ilcc';
process.env.DB_PATH = path.join(tmp, 'ilcc.db');
process.env.DOWNLOADS_DIR = path.join(tmp, 'downloads');
process.env.TRUSTED_PROXY_CIDR = '127.0.0.1/32,::1/128,::ffff:127.0.0.1/128';
process.env.HYDRA_PROXY_SECRET = 'test-secret';
process.env.SEED_ADMINS = 'gopeen1@newpaltz.edu';
process.env.GRADER_TIMEOUT_MS = '3000';
process.env.PORT = '0';

fs.mkdirSync(process.env.DOWNLOADS_DIR, { recursive: true });
/* Small real files so the downloads + materials routes have something to serve. */
fs.writeFileSync(path.join(process.env.DOWNLOADS_DIR, 'cuh-2e.pdf'), '%PDF-1.4\n%fake textbook\n');
fs.copyFileSync(path.join(__dirname, 'fixtures', 'cuh63-mini.zip'), path.join(process.env.DOWNLOADS_DIR, 'cuh63.zip'));

globalThis.__ILCC_TMP__ = tmp;
