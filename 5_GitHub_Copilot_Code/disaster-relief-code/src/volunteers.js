'use strict';
// FR-003: match volunteer skill sets to a task.

function haversineKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Returns volunteers who are verified, available and hold ALL required skills,
 * nearest to the task site first. At most `count` volunteers are returned.
 */
function matchVolunteers(task, volunteers) {
  const required = task.requiredSkills || [];
  return volunteers
    .filter((v) => v.verified && v.available)
    .filter((v) => required.every((skill) => (v.skills || []).includes(skill)))
    .map((v) => ({ ...v, distanceKm: task.location && v.location ? haversineKm(task.location, v.location) : null }))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, task.count || Infinity);
}

module.exports = { matchVolunteers, haversineKm };
