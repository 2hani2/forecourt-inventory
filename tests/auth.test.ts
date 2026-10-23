import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/app';

const secret = 'test-only-secret-with-at-least-32-characters';
let context: ReturnType<typeof createApp>;
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'forecourt-auth-'));
  context = createApp({ databasePath: join(dir, 'test.sqlite'), jwtSecret: secret });
});
afterEach(() => { context?.db.close(); rmSync(dir, { recursive: true, force: true }); });
const account = { name: 'Alex Morgan', email: 'alex@example.com', password: 'SecurePassword42!' };

describe('registration and token authentication', () => {
  it('registers a customer, hashes the password and issues a usable JWT', async () => {
    const res = await request(context.app).post('/api/auth/register').send(account);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: account.email, role: 'customer', name: account.name });
    expect(res.body.user).not.toHaveProperty('password');
    expect(jwt.verify(res.body.token, secret)).toMatchObject({ sub: res.body.user.id });
    const row = context.db.prepare('SELECT password_hash FROM users').get()!;
    expect(row.password_hash).not.toBe(account.password);
    expect(String(row.password_hash)).toMatch(/^\$2/);
    expect((await request(context.app).get('/api/auth/me').auth(res.body.token, { type: 'bearer' })).status).toBe(200);
  });
  it('normalizes email and rejects case-insensitive duplicates', async () => {
    await request(context.app).post('/api/auth/register').send(account);
    const res = await request(context.app).post('/api/auth/register').send({ ...account, email: ' ALEX@EXAMPLE.COM ' });
    expect(res.status).toBe(409);
  });
  it.each([
    { email: 'invalid' }, { password: 'short' }, { name: ' ' }, { password: 'x'.repeat(73) }, { role: 'admin' }
  ])('rejects invalid registration or role injection: %j', async (override) => {
    expect((await request(context.app).post('/api/auth/register').send({ ...account, ...override })).status).toBe(400);
  });
  it('logs in using normalized email and never exposes the hash', async () => {
    await request(context.app).post('/api/auth/register').send(account);
    const res = await request(context.app).post('/api/auth/login').send({ email: ' ALEX@EXAMPLE.COM ', password: account.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });
  it.each(['wrong-password', 'SecurePassword42!'])('uses a generic error for invalid credentials', async password => {
    const res = await request(context.app).post('/api/auth/login').send({ email: 'absent@example.com', password });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });
  it('rejects a wrong password for an existing account', async () => {
    await request(context.app).post('/api/auth/register').send(account);
    expect((await request(context.app).post('/api/auth/login').send({ email: account.email, password: 'incorrect123' })).status).toBe(401);
  });
  it.each([undefined, 'invalid', jwt.sign({ sub: 'missing' }, secret), jwt.sign({ sub: 'missing' }, secret, { expiresIn: -1 })])('rejects missing, invalid, unknown, or expired identity', async token => {
    const req = request(context.app).get('/api/auth/me');
    if (token) req.auth(token, { type: 'bearer' });
    expect((await req).status).toBe(401);
  });
  it('requires a strong server secret', () => {
    expect(() => createApp({ databasePath: join(dir, 'bad.sqlite'), jwtSecret: 'short' })).toThrow(/32/);
  });
  it('returns JSON for malformed JSON and unknown API routes', async () => {
    expect((await request(context.app).post('/api/auth/login').set('Content-Type', 'application/json').send('{')).status).toBe(400);
    expect((await request(context.app).get('/api/nope')).body.error).toBeTypeOf('string');
  });
});
