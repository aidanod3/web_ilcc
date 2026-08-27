/* Shared request helpers. app is required lazily so setup.js env applies first. */
import request from 'supertest';

let _app;
export function app() {
  if (!_app) _app = require('../index.js').app;
  return _app;
}

export const SECRET = 'test-secret';

/* Headers Traefik would add after forward-auth. */
export function as(email, roles = '') {
  return { 'X-Hydra-Proxy-Secret': SECRET, 'X-Hydra-Email': email, 'X-Hydra-User': email.split('@')[0], 'X-Hydra-Roles': roles };
}
export const ADMIN   = as('gopeen1@newpaltz.edu');
export const FACULTY = as('prof@newpaltz.edu', 'faculty,employee');
export const STUDENT = as('student1@newpaltz.edu', 'student');

export const get  = (url, h = {}) => request(app()).get(url).set(h);
export const post = (url, body, h = {}) => request(app()).post(url).set(h).send(body);
export const put  = (url, body, h = {}) => request(app()).put(url).set(h).send(body);
export const del  = (url, h = {}) => request(app()).delete(url).set(h);
