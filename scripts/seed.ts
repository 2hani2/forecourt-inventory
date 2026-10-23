import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../server/database';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 10 || Buffer.byteLength(password) > 72 || password.startsWith('replace-')) throw new Error('Set ADMIN_EMAIL and a unique ADMIN_PASSWORD (10–72 bytes) in .env before seeding.');
const db = openDatabase(process.env.DATABASE_PATH ?? './data/forecourt.sqlite');
try {
  const existing = db.prepare('SELECT role FROM users WHERE email = ?').get(email);
  if (existing && existing.role !== 'admin') throw new Error('This email already belongs to a customer; choose a different admin email.');
  if (!existing) db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(randomUUID(), 'Alex Morgan', email, await bcrypt.hash(password, 10), 'admin');
  if (!db.prepare('SELECT id FROM vehicles LIMIT 1').get()) {
    const vehicles = [
      ['Porsche','911 Carrera','Coupe',114400,3,2025,'Petrol','#adbbaa'],
      ['Land Rover','Defender 110','SUV',72900,5,2025,'Diesel','#b6b19f'],
      ['BMW','i4 eDrive40','Sedan',57400,2,2025,'Electric','#8fabb7'],
      ['Mercedes-Benz','C 300','Sedan',48950,4,2024,'Hybrid','#c2b5a7'],
      ['Audi','Q5 Premium','SUV',45800,0,2024,'Petrol','#b6bcc6'],
      ['MINI','Cooper S','Hatchback',32900,6,2025,'Petrol','#719186'],
      ['Ford','Mustang GT','Coupe',44610,1,2025,'Petrol','#c48d72'],
      ['Volvo','XC60 Recharge','SUV',57900,2,2025,'Hybrid','#9faeb9']
    ];
    db.exec('BEGIN');
    try {
      const insert = db.prepare('INSERT INTO vehicles (id,make,model,category,price_cents,quantity,year,fuel,color) VALUES (?,?,?,?,?,?,?,?,?)');
      for (const [make,model,category,price,quantity,year,fuel,color] of vehicles) insert.run(randomUUID(),make,model,category,Number(price)*100,quantity,year,fuel,color);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  console.log('Demo inventory ready. Sign in with the admin credentials from your .env file.');
} finally { db.close(); }
