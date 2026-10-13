'use strict';
const { compareRequisitions } = require('./priority');

/**
 * FR-002: match open requisitions against central warehouse stock.
 * Requisitions are served strictly in priority order, so a P3 blanket request
 * can never consume stock that a P1 water request needs.
 *
 * @param {Array}  requisitions  open requisitions (each already has .priority)
 * @param {Object} stock         e.g. { water: 500, medical_kit: 40, blanket: 300 }
 * @returns {{ manifest: Array, shortfalls: Array, remainingStock: Object }}
 *   Inputs are never mutated.
 */
function allocateSupplies(requisitions, stock) {
  const remaining = { ...stock };
  const manifest = [];
  const shortfalls = [];

  const ordered = requisitions
    .filter((r) => r.status === 'Open')
    .slice()
    .sort(compareRequisitions);

  ordered.forEach((req, index) => {
    const available = remaining[req.category] || 0;
    const allocated = Math.min(req.quantity, available);
    remaining[req.category] = available - allocated;

    const status = allocated === req.quantity ? 'Full' : allocated > 0 ? 'Partial' : 'None';
    manifest.push({
      dispatchOrder: index + 1,
      requisitionId: req.id,
      shelterId: req.shelterId,
      category: req.category,
      priority: req.priority,
      requested: req.quantity,
      allocated,
      status,
    });
    if (status !== 'Full') {
      shortfalls.push({
        requisitionId: req.id,
        category: req.category,
        priority: req.priority,
        missing: req.quantity - allocated,
      });
    }
  });

  return { manifest, shortfalls, remainingStock: remaining };
}

module.exports = { allocateSupplies };
