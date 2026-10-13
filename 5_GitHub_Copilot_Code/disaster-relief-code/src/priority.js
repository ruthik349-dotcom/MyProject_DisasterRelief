'use strict';
// FR-001: assign a delivery priority to a shelter requisition.
// Critical items (water, medical kits) running out soon always rank above everything else.

const CATEGORIES = ['water', 'medical_kit', 'blanket'];
const LIFE_CRITICAL = new Set(['water', 'medical_kit']);

const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3 }; // lower number = dispatched first

/**
 * P1 Critical : water / medical kit AND shelter stock lasts 24 h or less
 * P2 High     : water / medical kit, OR any item with 48 h or less of stock
 * P3 Normal   : everything else (e.g. blankets with stock remaining)
 */
function assignPriority(req) {
  const hours = Number(req.hoursOfStockLeft);
  if (LIFE_CRITICAL.has(req.category) && hours <= 24) return 'P1';
  if (LIFE_CRITICAL.has(req.category) || hours <= 48) return 'P2';
  return 'P3';
}

/** Sort comparator: priority first, then largest population affected, then oldest request. */
function compareRequisitions(a, b) {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  const byPopulation = (b.populationAffected || 0) - (a.populationAffected || 0);
  if (byPopulation !== 0) return byPopulation;
  return new Date(a.createdAt) - new Date(b.createdAt);
}

/** Validate a new requisition body. Returns an array of error strings (empty = valid). */
function validateRequisition(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Request body is required'];
  if (!body.shelterId) errors.push('shelterId is required');
  if (!CATEGORIES.includes(body.category)) errors.push(`category must be one of: ${CATEGORIES.join(', ')}`);
  if (!Number.isInteger(body.quantity) || body.quantity <= 0) errors.push('quantity must be a positive whole number');
  if (!Number.isFinite(Number(body.hoursOfStockLeft)) || Number(body.hoursOfStockLeft) < 0) {
    errors.push('hoursOfStockLeft must be a number >= 0');
  }
  if (body.populationAffected !== undefined &&
      (!Number.isInteger(body.populationAffected) || body.populationAffected < 0)) {
    errors.push('populationAffected must be a whole number >= 0');
  }
  return errors;
}

module.exports = { CATEGORIES, PRIORITY_RANK, assignPriority, compareRequisitions, validateRequisition };
