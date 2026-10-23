import { Router, type RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from './database';

export interface User { id: string; name: string; email: string; role: 'admin' | 'customer' }
declare global { namespace Express { interface Request { user?: User } } }
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(10).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes.');
const registration = z.object({ name: z.string().trim().min(1).max(80), email, password }).strict();
const login = z.object({ email, password: z.string().min(1).max(72) }).strict();
// A fixed valid hash keeps missing-account verification on the same expensive path.
const dummyHash = bcrypt.hashSync('unused-dummy-password', 10);

export function authService(db: Database, secret: string) {
  const authenticate: RequestHandler = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Please sign in to continue.' }); return; }
    try {
      const payload = jwt.verify(header.slice(7), secret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('Invalid subject');
      const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.sub) as unknown as User | undefined;
      if (!user) throw new Error('Account not found');
      req.user = user;
      next();
    } catch { res.status(401).json({ error: 'Your session has expired. Please sign in again.' }); }
  };
  const admin: RequestHandler = (req, res, next) => {
    if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Administrator access required.' }); return; }
    next();
  };
  const session = (user: User) => ({ user, token: jwt.sign({}, secret, { algorithm: 'HS256', subject: user.id, expiresIn: '8h' }) });
  const router = Router();
  router.post('/register', async (req, res) => {
    const input = registration.parse(req.body);
    const hash = await bcrypt.hash(input.password, 10);
    const user: User = { id: randomUUID(), name: input.name, email: input.email, role: 'customer' };
    // ON CONFLICT handles registrations racing for the same normalized email.
    const result = db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING').run(user.id, user.name, user.email, hash, user.role);
    if (!result.changes) { res.status(409).json({ error: 'An account with this email already exists.' }); return; }
    res.status(201).json(session(user));
  });
  router.post('/login', async (req, res) => {
    const input = login.parse(req.body);
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email) as unknown as (User & { password_hash: string }) | undefined;
    const valid = await bcrypt.compare(input.password, row?.password_hash ?? dummyHash);
    if (!row || !valid) { res.status(401).json({ error: 'Invalid email or password.' }); return; }
    const { password_hash: _, ...user } = row;
    res.json(session(user));
  });
  router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
  return { router, authenticate, admin };
}
