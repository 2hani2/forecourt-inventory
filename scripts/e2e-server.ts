import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import express from 'express';
import { createApp } from '../server/app';
const dir = mkdtempSync(join(tmpdir(), 'forecourt-e2e-'));
const { app, db } = createApp({
  databasePath: join(dir, 'test.sqlite'),
  jwtSecret: 'e2e-only-secret-at-least-32-characters-long',
});
db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(
  'admin',
  'Alex Morgan',
  'admin@example.com',
  await bcrypt.hash('TestingPassword42!', 10),
  'admin',
);
app.use(express.static(resolve('dist')));
app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
const server = app.listen(4173, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
      process.exit(0);
    }),
  );
