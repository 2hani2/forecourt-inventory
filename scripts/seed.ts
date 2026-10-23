import { demoVehicles } from './demo-vehicles';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../server/database';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (
  !email ||
  !password ||
  password.length < 10 ||
  Buffer.byteLength(password) > 72 ||
  password.startsWith('replace-')
)
  throw new Error(
    'Set ADMIN_EMAIL and a unique ADMIN_PASSWORD (10–72 bytes) in .env before seeding.',
  );
const db = openDatabase(process.env.DATABASE_PATH ?? './data/forecourt.sqlite');
try {
  const existing = db.prepare('SELECT role FROM users WHERE email = ?').get(email);
  if (existing && existing.role !== 'admin')
    throw new Error('This email already belongs to a customer; choose a different admin email.');
  if (!existing)
    db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(
      randomUUID(),
      'Alex Morgan',
      email,
      await bcrypt.hash(password, 10),
      'admin',
    );
  if (!db.prepare('SELECT id FROM vehicles LIMIT 1').get()) {
    db.exec('BEGIN');
    try {
      const insert = db.prepare(
        'INSERT INTO vehicles (id,make,model,category,price_cents,quantity,year,fuel,color) VALUES (?,?,?,?,?,?,?,?,?)',
      );
      for (const [make, model, category, price, quantity, year, fuel, color] of demoVehicles)
        insert.run(
          randomUUID(),
          make,
          model,
          category,
          Number(price) * 100,
          quantity,
          year,
          fuel,
          color,
        );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  console.log('Demo inventory ready. Sign in with the admin credentials from your .env file.');
} finally {
  db.close();
}
