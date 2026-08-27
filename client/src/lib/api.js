/* Tiny fetch wrapper: JSON in/out, throws {status, error, message} on !ok. */
import { API } from '../hooks/useMe';

export async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const init = { method, credentials: 'same-origin', headers: { ...headers } };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
  const r = await fetch(`${API}${path}`, init);
  if (raw) return r;
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!r.ok) {
    const err = new Error(data?.message || data?.error || `HTTP ${r.status}`);
    Object.assign(err, { status: r.status, data });
    throw err;
  }
  return data;
}

export const fmtBytes = (n) => {
  if (n == null) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
};
