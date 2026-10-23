import express from 'express';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createApp } from './app';
const { app, db } = createApp({ databasePath: process.env.DATABASE_PATH ?? './data/forecourt.sqlite', jwtSecret: process.env.JWT_SECRET ?? '' });
const dist = resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}
const server = app.listen(Number(process.env.PORT ?? 3001), '127.0.0.1', () => console.log(`Forecourt API listening on http://127.0.0.1:${process.env.PORT ?? 3001}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
