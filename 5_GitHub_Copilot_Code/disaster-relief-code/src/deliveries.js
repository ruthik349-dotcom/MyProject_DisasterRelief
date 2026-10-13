'use strict';
// FR-004: relief vehicle delivery tracking.

const TRANSITIONS = {
  Loaded: ['InTransit'],
  InTransit: ['Delivered', 'Delayed'],
  Delayed: ['InTransit', 'Delivered'],
  Delivered: [],
};

class DeliveryError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

/** Move a delivery to a new status. Only the assigned volunteer may update it. */
function updateDeliveryStatus(delivery, newStatus, volunteerId, now = new Date()) {
  if (delivery.assignedVolunteerId !== volunteerId) {
    throw new DeliveryError('Only the assigned volunteer can update this delivery', 403);
  }
  if (!(TRANSITIONS[delivery.status] || []).includes(newStatus)) {
    throw new DeliveryError(`Cannot change status from ${delivery.status} to ${newStatus}`, 409);
  }
  const updated = { ...delivery, status: newStatus, updatedAt: now.toISOString() };
  if (newStatus === 'Delivered') updated.deliveredAt = now.toISOString();
  return updated;
}

/** A delivery still on the road more than `graceMinutes` after its ETA is delayed. */
function isOverdue(delivery, now = new Date(), graceMinutes = 30) {
  if (delivery.status === 'Delivered') return false;
  return now - new Date(delivery.etaAt) > graceMinutes * 60 * 1000;
}

module.exports = { TRANSITIONS, DeliveryError, updateDeliveryStatus, isOverdue };
