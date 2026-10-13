# Disaster Relief Coordinator – core logic (Problem Statement #64)

Dependency-free Node.js (>= 18).

```
npm test     # runs all 24 tests
npm start    # API on http://localhost:3000
```

Demo tokens (send as `x-auth-token`): `tok-manager`, `tok-shelter`, `tok-vol`, `tok-unverified`.

| Endpoint | Role | Requirement |
|---|---|---|
| POST /api/requisitions | shelter_coordinator | FR-001 |
| POST /api/allocations/run | disaster_manager | FR-002 |
| POST /api/volunteers/match | disaster_manager | FR-003 |
| PATCH /api/deliveries/:id/status | relief_volunteer (assigned) | FR-004 |
