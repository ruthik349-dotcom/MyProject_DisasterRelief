'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/server');

async function start(seed) {
  const { server, db } = createApp(seed);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, token, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-auth-token': token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };
  return { call, db, close: () => new Promise((r) => server.close(r)) };
}

const good = { shelterId: 'S1', category: 'water', quantity: 100, hoursOfStockLeft: 6, populationAffected: 250 };

test('verified shelter coordinator can submit a requisition and gets a priority', async () => {
  const app = await start();
  const r = await app.call('POST', '/api/requisitions', 'tok-shelter', good);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.priority, 'P1');
  await app.close();
});

test('requisition without authentication gets 401 (NFR-002)', async () => {
  const app = await start();
  assert.strictEqual((await app.call('POST', '/api/requisitions', null, good)).status, 401);
  await app.close();
});

test('unverified account cannot submit a requisition (NFR-002)', async () => {
  const app = await start();
  assert.strictEqual((await app.call('POST', '/api/requisitions', 'tok-unverified', good)).status, 403);
  await app.close();
});

test('volunteer cannot run allocation (role check, NFR-002)', async () => {
  const app = await start();
  assert.strictEqual((await app.call('POST', '/api/allocations/run', 'tok-vol')).status, 403);
  await app.close();
});

test('invalid requisition is rejected with 400 and error list', async () => {
  const app = await start();
  const r = await app.call('POST', '/api/requisitions', 'tok-shelter', { ...good, quantity: -5 });
  assert.strictEqual(r.status, 400);
  assert.ok(r.body.errors.length >= 1);
  await app.close();
});

test('manager allocation serves critical water first and reduces warehouse stock', async () => {
  const app = await start({ stock: { water: 100, medical_kit: 10, blanket: 100 } });
  await app.call('POST', '/api/requisitions', 'tok-shelter', { ...good, category: 'blanket', quantity: 20, hoursOfStockLeft: 200 });
  await app.call('POST', '/api/requisitions', 'tok-shelter', good);
  const run = await app.call('POST', '/api/allocations/run', 'tok-manager');
  assert.strictEqual(run.status, 200);
  assert.strictEqual(run.body.manifest[0].category, 'water');
  assert.strictEqual(run.body.remainingStock.water, 0);
  // running it again must not allocate the same requisitions twice
  const again = await app.call('POST', '/api/allocations/run', 'tok-manager');
  assert.strictEqual(again.body.manifest.length, 0);
  await app.close();
});

test('volunteer updates own delivery; another volunteer is blocked', async () => {
  const app = await start({
    users: {
      'tok-v1': { id: 'V-1', role: 'relief_volunteer', verified: true },
      'tok-v2': { id: 'V-2', role: 'relief_volunteer', verified: true },
    },
    deliveries: [{ id: 'D-1', assignedVolunteerId: 'V-1', status: 'Loaded', etaAt: '2026-10-01T10:00:00Z' }],
  });
  assert.strictEqual((await app.call('PATCH', '/api/deliveries/D-1/status', 'tok-v2', { status: 'InTransit' })).status, 403);
  const ok = await app.call('PATCH', '/api/deliveries/D-1/status', 'tok-v1', { status: 'InTransit' });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.status, 'InTransit');
  assert.strictEqual((await app.call('PATCH', '/api/deliveries/D-1/status', 'tok-v1', { status: 'Loaded' })).status, 409);
  await app.close();
});
