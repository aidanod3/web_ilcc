import { describe, it, expect } from 'vitest';
import { get, post, del, as, ADMIN, FACULTY, STUDENT, SECRET } from './helpers.js';

describe('identity headers', () => {
  it('anonymous without headers', async () => {
    const r = await get('/api/me');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ anonymous: true });
  });

  it('forged X-Hydra-* WITHOUT the proxy secret are stripped', async () => {
    const r = await get('/api/me', { 'X-Hydra-Email': 'evil@newpaltz.edu', 'X-Hydra-Roles': 'faculty' });
    expect(r.body).toEqual({ anonymous: true });
  });

  it('wrong secret is also stripped', async () => {
    const r = await get('/api/me', { ...ADMIN, 'X-Hydra-Proxy-Secret': 'nope' });
    expect(r.body).toEqual({ anonymous: true });
  });

  it('seeded admin resolves', async () => {
    const r = await get('/api/me', ADMIN);
    expect(r.body).toMatchObject({ email: 'gopeen1@newpaltz.edu', netid: 'gopeen1', role: 'admin' });
  });

  it('faculty affiliation auto-promotes to admin and persists', async () => {
    const r = await get('/api/me', FACULTY);
    expect(r.body.role).toBe('admin');
    // second request WITHOUT the roles header still admin (persisted in staff table)
    const r2 = await get('/api/me', { ...FACULTY, 'X-Hydra-Roles': '' });
    expect(r2.body.role).toBe('admin');
  });

  it('plain student has no role', async () => {
    const r = await get('/api/me', STUDENT);
    expect(r.body).toMatchObject({ email: 'student1@newpaltz.edu', role: null });
  });

  it('email is lowercased', async () => {
    const r = await get('/api/me', as('MiXeD@NewPaltz.EDU'));
    expect(r.body.email).toBe('mixed@newpaltz.edu');
  });
});

describe('role gates', () => {
  it('grader: 401 anon, 403 student, 200 admin', async () => {
    expect((await get('/api/grader/assignments')).status).toBe(401);
    expect((await get('/api/grader/assignments', STUDENT)).status).toBe(403);
    expect((await get('/api/grader/assignments', ADMIN)).status).toBe(200);
  });

  it('staff: 403 for a TA, 200 for admin', async () => {
    await post('/api/staff', { email: 'ta1@newpaltz.edu', role: 'ta' }, ADMIN);
    const ta = as('ta1@newpaltz.edu');
    expect((await get('/api/staff', ta)).status).toBe(403);
    expect((await get('/api/grader/assignments', ta)).status).toBe(200);
    expect((await get('/api/staff', ADMIN)).status).toBe(200);
  });

  it('staff management rules', async () => {
    expect((await post('/api/staff', { email: 'x@gmail.com', role: 'ta' }, ADMIN)).status).toBe(400);
    expect((await post('/api/staff', { email: 'y@newpaltz.edu', role: 'god' }, ADMIN)).status).toBe(400);
    expect((await del('/api/staff/gopeen1@newpaltz.edu', ADMIN)).status).toBe(400);   // self
    expect((await del('/api/staff/nobody@newpaltz.edu', ADMIN)).status).toBe(404);
    expect((await del('/api/staff/ta1@newpaltz.edu', ADMIN)).status).toBe(204);
  });

  it('student endpoints need SSO', async () => {
    expect((await get('/api/assignments/open')).status).toBe(401);
    expect((await get('/api/assignments/open', STUDENT)).status).toBe(200);
  });
});
