'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { assignPriority, validateRequisition } = require('../src/priority');
const { allocateSupplies } = require('../src/allocation');
const { matchVolunteers } = require('../src/volunteers');
const { updateDeliveryStatus, isOverdue } = require('../src/deliveries');

const req = (id, category, quantity, hoursOfStockLeft, extra = {}) => {
  const r = { id, shelterId: 'S1', category, quantity, hoursOfStockLeft, status: 'Open',
    populationAffected: 0, createdAt: '2026-10-01T08:00:00Z', ...extra };
  r.priority = assignPriority(r);
  return r;
};

// ---- FR-001 priority ----
test('water with <=24h of stock is P1 critical', () => assert.strictEqual(assignPriority({ category: 'water', hoursOfStockLeft: 10 }), 'P1'));
test('medical kit with plenty of stock is still P2', () => assert.strictEqual(assignPriority({ category: 'medical_kit', hoursOfStockLeft: 100 }), 'P2'));
test('blankets with plenty of stock are P3', () => assert.strictEqual(assignPriority({ category: 'blanket', hoursOfStockLeft: 100 }), 'P3'));
test('blankets about to run out are P2', () => assert.strictEqual(assignPriority({ category: 'blanket', hoursOfStockLeft: 36 }), 'P2'));
test('validation rejects bad category, zero quantity and missing shelter', () => {
  const errs = validateRequisition({ category: 'pizza', quantity: 0, hoursOfStockLeft: 5 });
  assert.strictEqual(errs.length, 3);
});
test('validation accepts a good requisition', () => {
  assert.deepStrictEqual(validateRequisition({ shelterId: 'S1', category: 'water', quantity: 50, hoursOfStockLeft: 6 }), []);
});

// ---- FR-002 allocation ----
test('P1 water is dispatched before P3 blankets (sample FR-001 pass criterion)', () => {
  const { manifest } = allocateSupplies([req('R1', 'blanket', 10, 200), req('R2', 'water', 10, 5)], { water: 100, blanket: 100 });
  assert.strictEqual(manifest[0].requisitionId, 'R2');
  assert.strictEqual(manifest[0].dispatchOrder, 1);
});
test('scarce stock goes to the higher priority requisition first', () => {
  const { manifest, shortfalls } = allocateSupplies(
    [req('R1', 'water', 80, 100), req('R2', 'water', 80, 5)], { water: 100 });
  const r2 = manifest.find((m) => m.requisitionId === 'R2');
  const r1 = manifest.find((m) => m.requisitionId === 'R1');
  assert.strictEqual(r2.allocated, 80);
  assert.strictEqual(r1.allocated, 20);
  assert.strictEqual(r1.status, 'Partial');
  assert.deepStrictEqual(shortfalls.map((s) => [s.requisitionId, s.missing]), [['R1', 60]]);
});
test('allocation never mutates its inputs', () => {
  const stock = { water: 50 };
  const list = [req('R1', 'water', 10, 5)];
  allocateSupplies(list, stock);
  assert.strictEqual(stock.water, 50);
  assert.strictEqual(list[0].status, 'Open');
});
test('no stock gives status None and a shortfall', () => {
  const { manifest, shortfalls } = allocateSupplies([req('R1', 'medical_kit', 5, 2)], { medical_kit: 0 });
  assert.strictEqual(manifest[0].status, 'None');
  assert.strictEqual(shortfalls[0].missing, 5);
});
test('already-allocated requisitions are skipped', () => {
  const done = req('R1', 'water', 10, 5, { status: 'Allocated' });
  assert.strictEqual(allocateSupplies([done], { water: 100 }).manifest.length, 0);
});

// ---- FR-003 volunteer matching ----
const vols = [
  { id: 'V1', skills: ['first_aid', 'driving'], verified: true, available: true, location: { lat: 12.97, lng: 77.59 } },
  { id: 'V2', skills: ['first_aid'], verified: true, available: true, location: { lat: 12.90, lng: 77.60 } },
  { id: 'V3', skills: ['first_aid', 'driving'], verified: false, available: true, location: { lat: 12.97, lng: 77.59 } },
  { id: 'V4', skills: ['first_aid', 'driving'], verified: true, available: false, location: { lat: 12.97, lng: 77.59 } },
];
test('only verified, available volunteers holding all required skills are matched', () => {
  const out = matchVolunteers({ requiredSkills: ['first_aid', 'driving'] }, vols);
  assert.deepStrictEqual(out.map((v) => v.id), ['V1']);
});
test('nearest volunteer is listed first and count is respected', () => {
  const out = matchVolunteers({ requiredSkills: ['first_aid'], location: { lat: 12.90, lng: 77.60 }, count: 1 }, vols);
  assert.deepStrictEqual(out.map((v) => v.id), ['V2']);
});

// ---- FR-004 deliveries ----
const delivery = { id: 'D1', assignedVolunteerId: 'V1', status: 'Loaded', etaAt: '2026-10-01T10:00:00Z' };
test('delivery follows Loaded -> InTransit -> Delivered', () => {
  const a = updateDeliveryStatus(delivery, 'InTransit', 'V1');
  const b = updateDeliveryStatus(a, 'Delivered', 'V1');
  assert.strictEqual(b.status, 'Delivered');
  assert.ok(b.deliveredAt);
});
test('cannot jump straight from Loaded to Delivered', () => {
  assert.throws(() => updateDeliveryStatus(delivery, 'Delivered', 'V1'), /Cannot change status/);
});
test('a different volunteer cannot update the delivery', () => {
  assert.throws(() => updateDeliveryStatus(delivery, 'InTransit', 'V2'), /assigned volunteer/);
});
test('delivery 31+ minutes past ETA is overdue; delivered ones never are', () => {
  const late = { ...delivery, status: 'InTransit' };
  assert.strictEqual(isOverdue(late, new Date('2026-10-01T10:31:00Z')), true);
  assert.strictEqual(isOverdue(late, new Date('2026-10-01T10:20:00Z')), false);
  assert.strictEqual(isOverdue({ ...late, status: 'Delivered' }, new Date('2026-10-02T00:00:00Z')), false);
});
