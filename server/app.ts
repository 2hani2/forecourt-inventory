import express from 'express';
import { DatabaseSync } from 'node:sqlite';
export function createApp(options: { databasePath: string; jwtSecret: string }) {
  return { app: express(), db: new DatabaseSync(options.databasePath) };
}
