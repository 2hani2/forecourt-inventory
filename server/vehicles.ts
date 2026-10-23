import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from './database';

export const categories = ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Truck', 'Convertible', 'Wagon'] as const;
const money = z.number().finite().min(0).max(100000000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001, 'Use at most two decimal places.');
const fields = {
  make: z.string().trim().min(1).max(60), model: z.string().trim().min(1).max(80),
  category: z.enum(categories), price: money, quantity: z.number().int().min(0).max(1000000),
  year: z.number().int().min(1886).max(2100), fuel: z.enum(['Petrol', 'Diesel', 'Electric', 'Hybrid']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
};
const createSchema = z.object({ ...fields, year: fields.year.default(new Date().getFullYear()), fuel: fields.fuel.default('Petrol'), color: fields.color.default('#b7c5b6') }).strict();
const updateSchema = z.object(fields).partial().strict().refine(v => Object.keys(v).length > 0, 'Provide at least one field.');
const amount = z.number().int().positive().max(1000000);
const filterMoney = z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).pipe(money).optional();
const searchSchema = z.object({
  q: z.string().trim().max(100).optional(), make: z.string().trim().max(60).optional(),
  model: z.string().trim().max(80).optional(), category: z.string().trim().max(40).optional(),
  minPrice: filterMoney, maxPrice: filterMoney, inStock: z.enum(['true', 'false']).optional()
}).strict().refine(v => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, 'Minimum price cannot exceed maximum price.');
const publicVehicle = (row: Record<string, unknown>) => {
  const { price_cents, created_at, ...rest } = row;
  return { ...rest, price: Number(price_cents) / 100, createdAt: created_at };
};
const escapedLike = (s: string) => `%${s.replace(/[\\%_]/g, '\\$&')}%`;

export function vehicleRouter(db: Database, authenticate: RequestHandler, admin: RequestHandler) {
  const router = Router();
  router.use(authenticate);
  const find = (id: string) => db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
  router.get(['/', '/search'], (req, res) => {
    const filters = searchSchema.parse(req.query);
    const clauses: string[] = []; const args: (string | number)[] = [];
    for (const key of ['make', 'model', 'category'] as const) {
      if (filters[key]) { clauses.push(`${key} LIKE ? ESCAPE '\\'`); args.push(escapedLike(filters[key])); }
    }
    if (filters.q) { clauses.push("(make LIKE ? ESCAPE '\\' OR model LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')"); args.push(...Array(3).fill(escapedLike(filters.q))); }
    if (filters.minPrice !== undefined) { clauses.push('price_cents >= ?'); args.push(Math.round(filters.minPrice * 100)); }
    if (filters.maxPrice !== undefined) { clauses.push('price_cents <= ?'); args.push(Math.round(filters.maxPrice * 100)); }
    if (filters.inStock === 'true') clauses.push('quantity > 0');
    const rows = db.prepare(`SELECT * FROM vehicles ${clauses.length ? 'WHERE '+clauses.join(' AND ') : ''} ORDER BY created_at DESC, id`).all(...args);
    res.json({ vehicles: rows.map(publicVehicle) });
  });
  router.post('/', (req, res) => {
    const v = createSchema.parse(req.body); const id = randomUUID();
    db.prepare('INSERT INTO vehicles (id, make, model, category, price_cents, quantity, year, fuel, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, v.make, v.model, v.category, Math.round(v.price * 100), v.quantity, v.year, v.fuel, v.color);
    res.status(201).json({ vehicle: publicVehicle(find(id)!) });
  });
  router.put('/:id', (req, res) => {
    const v = updateSchema.parse(req.body);
    if (v.quantity !== undefined && req.user?.role !== 'admin') { res.status(403).json({ error: 'Only administrators may adjust stock.' }); return; }
    if (!find(req.params.id)) { res.status(404).json({ error: 'Vehicle not found.' }); return; }
    const entries = Object.entries(v);
    const columns = entries.map(([key]) => `${key === 'price' ? 'price_cents' : key} = ?`);
    const values = entries.map(([key, value]) => key === 'price' ? Math.round(Number(value) * 100) : value);
    // Column names come only from the strict validated schema, never directly from input.
    db.prepare(`UPDATE vehicles SET ${columns.join(', ')} WHERE id = ?`).run(...values, req.params.id);
    res.json({ vehicle: publicVehicle(find(req.params.id)!) });
  });
  router.delete('/:id', admin, (req, res) => {
    if (!db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id).changes) { res.status(404).json({ error: 'Vehicle not found.' }); return; }
    res.status(204).end();
  });
  router.post('/:id/purchase', (req, res) => {
    const { quantity } = z.object({ quantity: amount.default(1) }).strict().parse(req.body ?? {});
    // The condition and decrement are one SQLite statement: stock can never go negative.
    const row = db.prepare('UPDATE vehicles SET quantity = quantity - ? WHERE id = ? AND quantity >= ? RETURNING *').get(quantity, req.params.id, quantity);
    if (!row) { res.status(find(req.params.id) ? 409 : 404).json({ error: find(req.params.id) ? 'Not enough stock for this purchase.' : 'Vehicle not found.' }); return; }
    res.json({ vehicle: publicVehicle(row) });
  });
  router.post('/:id/restock', admin, (req, res) => {
    const { quantity } = z.object({ quantity: amount }).strict().parse(req.body);
    const row = db.prepare('UPDATE vehicles SET quantity = quantity + ? WHERE id = ? AND quantity <= 1000000 - ? RETURNING *').get(quantity, req.params.id, quantity);
    if (!row) { res.status(find(req.params.id) ? 409 : 404).json({ error: find(req.params.id) ? 'Stock limit exceeded.' : 'Vehicle not found.' }); return; }
    res.json({ vehicle: publicVehicle(row) });
  });
  return router;
}
