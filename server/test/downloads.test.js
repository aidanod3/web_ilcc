import { describe, it, expect } from 'vitest';
import { get, post, ADMIN, STUDENT } from './helpers.js';

describe('downloads', () => {
  it('manifest is public and lists only files present', async () => {
    await post('/api/downloads/_rescan', {}, ADMIN);
    const r = await get('/api/downloads/manifest');
    expect(r.status).toBe(200);
    const names = r.body.files.map(f => f.file).sort();
    expect(names).toEqual(['cuh-2e.pdf', 'cuh63.zip']);
    for (const f of r.body.files) {
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(f.size).toBeGreaterThan(0);
      expect(f.title).toBeTruthy();
    }
    expect(r.body.signedIn).toBe(false);
  });

  it('file needs SSO', async () => {
    expect((await get('/api/downloads/cuh63.zip')).status).toBe(401);
  });

  it('serves with Content-Disposition and supports Range', async () => {
    const r = await get('/api/downloads/cuh-2e.pdf', STUDENT);
    expect(r.status).toBe(200);
    expect(r.headers['content-disposition']).toContain('cuh-2e.pdf');
    const p = await get('/api/downloads/cuh63.zip', { ...STUDENT, Range: 'bytes=0-9' });
    expect(p.status).toBe(206);
    expect(p.headers['content-length']).toBe('10');
  });

  it('rejects traversal, unknown names, and bad extensions', async () => {
    for (const bad of ['..%2Fserver.log', '%2e%2e/x.zip', 'nope.zip', 'evil.exe', 'cuh-2e.pdf%00.zip']) {
      const r = await get(`/api/downloads/${bad}`, STUDENT);
      expect(r.status, bad).toBe(404);
    }
  });

  it('_rescan is admin-only', async () => {
    expect((await post('/api/downloads/_rescan', {}, STUDENT)).status).toBe(403);
    expect((await post('/api/downloads/_rescan', {}, ADMIN)).status).toBe(200);
  });
});

describe('materials (slides + textbook from the zip)', () => {
  it('needs SSO', async () => {
    expect((await get('/api/materials')).status).toBe(401);
  });

  it('indexes slides by chapter and reference sheets separately', async () => {
    const r = await get('/api/materials', STUDENT);
    expect(r.status).toBe(200);
    expect(r.body.source).toBe('cuh63.zip');
    expect(r.body.textbook).toMatchObject({ file: 'cuh-2e.pdf' });
    const ch7 = r.body.chapters.find(c => c.chapter === 7);
    expect(ch7.items.map(i => i.ext)).toEqual(['pdf', 'docx']);     // pdf first
    expect(ch7.items[0].title).toBe('Pointers');
    const ref = r.body.chapters.find(c => c.title === 'Reference sheets');
    expect(ref.items.some(i => i.name === 'LCCInstructionSetSummary.pdf')).toBe(true);
  });

  it('streams a pdf inline and a docx as attachment', async () => {
    const idx = (await get('/api/materials', STUDENT)).body;
    const ch7 = idx.chapters.find(c => c.chapter === 7).items;
    const pdf = await get(`/api/materials/${ch7[0].id}`, STUDENT);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.headers['content-disposition']).toMatch(/^inline/);
    const docx = await get(`/api/materials/${ch7[1].id}`, STUDENT);
    expect(docx.headers['content-disposition']).toMatch(/^attachment/);
    expect((await get('/api/materials/bogus', STUDENT)).status).toBe(404);
  });
});
