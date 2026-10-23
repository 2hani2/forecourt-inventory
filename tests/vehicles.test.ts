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
let admin: string;
let customer: string;
const car = { make: 'Porsche', model: '911 Carrera', category: 'Coupe', price: 114400.25, quantity: 3, year: 2025, fuel: 'Petrol', color: '#b7c5b6' };
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'forecourt-inventory-'));
  context = createApp({ databasePath: join(dir, 'test.sqlite'), jwtSecret: secret });
  for (const role of ['admin', 'customer']) context.db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(role, role, `${role}@example.com`, 'unused', role);
  admin = jwt.sign({}, secret, { subject: 'admin' });
  customer = jwt.sign({}, secret, { subject: 'customer' });
});
afterEach(() => { context.db.close(); rmSync(dir, { recursive: true, force: true }); });
const add = (data = car) => request(context.app).post('/api/vehicles').auth(admin, { type: 'bearer' }).send(data);
const get = (url = '/api/vehicles') => request(context.app).get(url).auth(customer, { type: 'bearer' });

describe('vehicle catalog', () => {
  it('requires a token on every vehicle route', async () => {
    for (const [method, path] of [['get',''], ['get','/search'], ['post',''], ['put','/any'], ['delete','/any'], ['post','/any/purchase'], ['post','/any/restock']] as const) {
      expect((await request(context.app)[method]('/api/vehicles'+path)).status).toBe(401);
    }
  });
  it('creates uniquely identified vehicles and lists zero-stock entries too', async () => {
    const first = await add(); const second = await add({ ...car, quantity: 0 });
    expect(first.status).toBe(201);
    expect(first.body.vehicle).toMatchObject(car);
    expect(first.body.vehicle.id).not.toBe(second.body.vehicle.id);
    const res = await get(); expect(res.body.vehicles).toHaveLength(2);
    expect(res.body.vehicles[0]).not.toHaveProperty('price_cents');
  });
  it('persists data after the connection is closed and reopened', async () => {
    await add(); context.db.close();
    context = createApp({ databasePath: join(dir, 'test.sqlite'), jwtSecret: secret });
    expect((await get()).body.vehicles[0]).toMatchObject(car);
  });
  it('uses defaults when only required vehicle fields are supplied', async () => {
    const { year, fuel, color, ...required } = car;
    const res = await request(context.app).post('/api/vehicles').auth(customer, { type: 'bearer' }).send(required);
    expect(res.status).toBe(201);
    expect(res.body.vehicle).toMatchObject(required);
  });
  it.each([{ make: '' }, { model: ' ' }, { category: 'Spaceship' }, { price: -1 }, { price: 1.001 }, { price: '300' }, { quantity: -1 }, { quantity: 1.5 }, { quantity: 1000001 }, { color: 'javascript:x' }, { year: 1 }, { id: 'injected' }])('validates vehicle fields %j', async override => {
    expect((await add({ ...car, ...override } as typeof car)).status).toBe(400);
  });
  it('combines case-insensitive make, model, category and inclusive price filters', async () => {
    await add(); await add({ ...car, make: 'BMW', model: 'i4', category: 'Sedan', price: 52000 });
    const res = await get('/api/vehicles/search?make=pOr&model=carrera&category=coupe&minPrice=114400.25&maxPrice=114400.25');
    expect(res.body.vehicles).toHaveLength(1);
    expect(res.body.vehicles[0].make).toBe('Porsche');
    expect((await get('/api/vehicles/search?q=BMW')).body.vehicles).toHaveLength(1);
    expect((await get('/api/vehicles/search?q=nonexistent')).body.vehicles).toEqual([]);
  });
  it('treats SQL and LIKE wildcards as literal search strings', async () => {
    await add();
    for (const q of ["' OR 1=1 --", '%', '_']) expect((await get('/api/vehicles/search?q='+encodeURIComponent(q))).body.vehicles).toEqual([]);
  });
  it.each(['minPrice=-1', 'maxPrice=no', 'minPrice=100&maxPrice=1', 'make=a&make=b', 'inStock=invalid'])('rejects invalid filters: %s', async query => {
    expect((await get('/api/vehicles/search?'+query)).status).toBe(400);
  });
  it('filters in-stock vehicles', async () => {
    await add(); await add({ ...car, quantity: 0 });
    expect((await get('/api/vehicles/search?inStock=true')).body.vehicles).toHaveLength(1);
  });
  it('updates details without changing identity or unrelated fields', async () => {
    const { body } = await add();
    const res = await request(context.app).put('/api/vehicles/'+body.vehicle.id).auth(customer, { type: 'bearer' }).send({ model: '911 GT3', price: 160000 });
    expect(res.status).toBe(200);
    expect(res.body.vehicle).toMatchObject({ ...car, id: body.vehicle.id, model: '911 GT3', price: 160000 });
  });
  it('requires admin to change stock through an update', async () => {
    const { body } = await add();
    expect((await request(context.app).put('/api/vehicles/'+body.vehicle.id).auth(customer, { type: 'bearer' }).send({ quantity: 100 })).status).toBe(403);
    expect((await request(context.app).put('/api/vehicles/'+body.vehicle.id).auth(admin, { type: 'bearer' }).send({ quantity: 10 })).body.vehicle.quantity).toBe(10);
  });
  it('rejects an empty update', async () => {
    const { body } = await add();
    expect((await request(context.app).put('/api/vehicles/'+body.vehicle.id).auth(admin, { type: 'bearer' }).send({})).status).toBe(400);
  });
  it('allows only admins to delete', async () => {
    const { body } = await add(); const url = '/api/vehicles/'+body.vehicle.id;
    expect((await request(context.app).delete(url).auth(customer, { type: 'bearer' })).status).toBe(403);
    expect((await request(context.app).delete(url).auth(admin, { type: 'bearer' })).status).toBe(204);
    expect((await get()).body.vehicles).toEqual([]);
    expect((await request(context.app).delete(url).auth(admin, { type: 'bearer' })).status).toBe(404);
  });
});

describe('atomic inventory operations', () => {
  it('purchases one unit by default and an explicit positive quantity', async () => {
    const { body } = await add(); const url = `/api/vehicles/${body.vehicle.id}/purchase`;
    expect((await request(context.app).post(url).auth(customer, { type: 'bearer' }).send({})).body.vehicle.quantity).toBe(2);
    expect((await request(context.app).post(url).auth(customer, { type: 'bearer' }).send({ quantity: 2 })).body.vehicle.quantity).toBe(0);
    expect((await request(context.app).post(url).auth(customer, { type: 'bearer' }).send({})).status).toBe(409);
  });
  it('does not partially fulfill an oversized purchase', async () => {
    const { body } = await add();
    expect((await request(context.app).post(`/api/vehicles/${body.vehicle.id}/purchase`).auth(customer, { type: 'bearer' }).send({ quantity: 4 })).status).toBe(409);
    expect((await get()).body.vehicles[0].quantity).toBe(3);
  });
  it('prevents overselling under concurrent requests using separate database connections', async () => {
    const { body } = await add({ ...car, quantity: 1 });
    const other = createApp({ databasePath: join(dir, 'test.sqlite'), jwtSecret: secret });
    try {
      const results = await Promise.all([context.app, other.app].map(app => request(app).post(`/api/vehicles/${body.vehicle.id}/purchase`).auth(customer, { type: 'bearer' }).send({})));
      expect(results.map(r => r.status).sort()).toEqual([200, 409]);
      expect((await get()).body.vehicles[0].quantity).toBe(0);
    } finally { other.db.close(); }
  });
  it('restocks only as admin, preserving existing quantity', async () => {
    const { body } = await add(); const url = `/api/vehicles/${body.vehicle.id}/restock`;
    expect((await request(context.app).post(url).auth(customer, { type: 'bearer' }).send({ quantity: 5 })).status).toBe(403);
    expect((await request(context.app).post(url).auth(admin, { type: 'bearer' }).send({ quantity: 5 })).body.vehicle.quantity).toBe(8);
  });
  it('prevents stock overflow', async () => {
    const { body } = await add({ ...car, quantity: 1000000 });
    expect((await request(context.app).post(`/api/vehicles/${body.vehicle.id}/restock`).auth(admin, { type: 'bearer' }).send({ quantity: 1 })).status).toBe(409);
  });
  it.each([0, -1, 1.5, '2', 1000001])('rejects an invalid purchase and restock amount: %s', async quantity => {
    const { body } = await add();
    for (const action of ['purchase', 'restock']) expect((await request(context.app).post(`/api/vehicles/${body.vehicle.id}/${action}`).auth(admin, { type: 'bearer' }).send({ quantity })).status).toBe(400);
  });
  it('requires an explicit restock quantity', async () => {
    const { body } = await add();
    expect((await request(context.app).post(`/api/vehicles/${body.vehicle.id}/restock`).auth(admin, { type: 'bearer' }).send({})).status).toBe(400);
  });
  it('returns 404 for missing vehicles on mutations', async () => {
    for (const action of ['purchase', 'restock']) expect((await request(context.app).post(`/api/vehicles/missing/${action}`).auth(admin, { type: 'bearer' }).send({ quantity: 1 })).status).toBe(404);
    expect((await request(context.app).put('/api/vehicles/missing').auth(admin, { type: 'bearer' }).send({ make: 'BMW' })).status).toBe(404);
  });
});
