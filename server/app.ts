import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import { openDatabase } from './database';
import { authService } from './auth';

export interface AppOptions { databasePath: string; jwtSecret: string; authLimit?: number }
export function createApp(options: AppOptions) {
  if (options.jwtSecret.length < 32 || options.jwtSecret.startsWith('replace-')) throw new Error('JWT_SECRET must be a random secret of at least 32 characters.');
  const db = openDatabase(options.databasePath);
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));
  const auth = authService(db, options.jwtSecret);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: options.authLimit ?? 100, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Please try again later.' } }), auth.router);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) { res.status(400).json({ error: 'Please check your input.', details: error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) }); return; }
    if (error.type === 'entity.parse.failed') { res.status(400).json({ error: 'Invalid JSON body.' }); return; }
    if (error.type === 'entity.too.large') { res.status(413).json({ error: 'Request body is too large.' }); return; }
    console.error(error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  };
  app.use(errors);
  return { app, db };
}
