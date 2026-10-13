'use strict';
// Minimal dependency-free REST API (Node >= 18). Data is held in memory for the lab demo;
// a real deployment would use PostgreSQL and make allocation a single database transaction.
const http = require('http');
const { assignPriority, validateRequisition } = require('./priority');
const { allocateSupplies } = require('./allocation');
const { matchVolunteers } = require('./volunteers');
const { updateDeliveryStatus, DeliveryError } = require('./deliveries');

function createApp(seed = {}) {
  const db = {
    // Demo accounts: token -> user. NFR-002: only verified users with the right role may act.
    users: seed.users || {
      'tok-manager': { id: 'U-M1', role: 'disaster_manager', verified: true },
      'tok-shelter': { id: 'U-S1', role: 'shelter_coordinator', verified: true },
      'tok-vol': { id: 'V-1', role: 'relief_volunteer', verified: true },
      'tok-unverified': { id: 'U-S9', role: 'shelter_coordinator', verified: false },
    },
    stock: seed.stock || { water: 500, medical_kit: 40, blanket: 300 },
    requisitions: seed.requisitions || [],
    volunteers: seed.volunteers || [],
    deliveries: seed.deliveries || [],
    manifest: [],
    nextId: 1,
  };

  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const readBody = (req) => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new DeliveryError('Invalid JSON', 400)); } });
  });

  function authorise(req, roles) {
    const user = db.users[req.headers['x-auth-token']];
    if (!user) throw new DeliveryError('Authentication required', 401);
    if (!user.verified) throw new DeliveryError('Account is not verified', 403);
    if (!roles.includes(user.role)) throw new DeliveryError('Role not permitted for this action', 403);
    return user;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = `${req.method} ${url.pathname}`;

      if (route === 'POST /api/requisitions') {                       // UC-01, FR-001
        authorise(req, ['shelter_coordinator']);
        const body = await readBody(req);
        const errors = validateRequisition(body);
        if (errors.length) return send(res, 400, { errors });
        const reqn = {
          id: `R-${db.nextId++}`, shelterId: body.shelterId, category: body.category,
          quantity: body.quantity, hoursOfStockLeft: Number(body.hoursOfStockLeft),
          populationAffected: body.populationAffected || 0,
          status: 'Open', createdAt: new Date().toISOString(),
        };
        reqn.priority = assignPriority(reqn);
        db.requisitions.push(reqn);
        return send(res, 201, reqn);
      }

      if (route === 'GET /api/requisitions') {
        authorise(req, ['disaster_manager']);
        return send(res, 200, db.requisitions);
      }

      if (route === 'POST /api/allocations/run') {                    // UC-02, FR-002
        authorise(req, ['disaster_manager']);
        const result = allocateSupplies(db.requisitions, db.stock);
        db.stock = result.remainingStock;
        result.manifest.forEach((line) => {
          const r = db.requisitions.find((x) => x.id === line.requisitionId);
          if (r) r.status = line.status === 'Full' ? 'Allocated' : line.status === 'Partial' ? 'PartiallyAllocated' : 'Open';
        });
        db.manifest = db.manifest.concat(result.manifest.filter((l) => l.allocated > 0));
        return send(res, 200, result);
      }

      if (route === 'POST /api/volunteers/match') {                   // UC-05, FR-003
        authorise(req, ['disaster_manager']);
        const task = await readBody(req);
        return send(res, 200, matchVolunteers(task, db.volunteers));
      }

      const m = url.pathname.match(/^\/api\/deliveries\/([^/]+)\/status$/);
      if (m && req.method === 'PATCH') {                              // UC-08, FR-004
        const user = authorise(req, ['relief_volunteer']);
        const { status } = await readBody(req);
        const idx = db.deliveries.findIndex((d) => d.id === m[1]);
        if (idx === -1) return send(res, 404, { error: 'Delivery not found' });
        db.deliveries[idx] = updateDeliveryStatus(db.deliveries[idx], status, user.id);
        return send(res, 200, db.deliveries[idx]);
      }

      return send(res, 404, { error: 'Not found' });
    } catch (err) {
      return send(res, err.status || 500, { error: err.message });
    }
  });

  return { server, db };
}

if (require.main === module) {
  const { server } = createApp();
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Disaster Relief API listening on ${port}`));
}

module.exports = { createApp };
