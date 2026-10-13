# Folder 5 – GitHub Copilot generated code

Working reference implementation: [disaster-relief-code/](disaster-relief-code/) (Node.js, no dependencies, `npm test` runs 24 tests, all passing).

## What to do (in VS Code with GitHub Copilot Chat)
1. Open a new folder for the project code and start Copilot Chat.
2. Give it prompts based on the SRS. Suggested prompts (one per core requirement):
   - **Prompt 1 (FR-001):** "Create a Node.js REST route POST /api/requisitions that lets a verified Shelter Coordinator submit a requisition with shelterId, category (water, medical_kit, blanket), quantity and hoursOfStockLeft. Reject invalid input, and assign priority P1 for water or medical kits with 24 hours or less of stock, P2 for other water/medical kits or any item with 48 hours or less, otherwise P3."
   - **Prompt 2 (FR-002):** "Write a function allocateSupplies(requisitions, stock) that serves open requisitions in priority order (P1 first, ties by people affected then oldest), allocates min(requested, available), deducts stock, returns a manifest in dispatch order plus a list of shortfalls, and never mutates its inputs."
   - **Prompt 3 (FR-003/FR-004):** "Write matchVolunteers(task, volunteers) that returns verified, available volunteers holding all required skills nearest first, and updateDeliveryStatus() that only lets the assigned volunteer move a delivery Loaded to In Transit to Delivered (In Transit may become Delayed)."
3. Read the code Copilot gives and fix anything wrong. Compare with `disaster-relief-code/src/` and run its tests against your version if you like.

## What to save here
- [ ] Screenshot of each prompt and Copilot reply (at least 3).
- [ ] The generated code files, or the link to your code repository.
- [ ] 2 or 3 lines on what you changed and why (write this from your own Copilot session).

Repository link: [your code repo link]

## Reference implementation summary
- `src/priority.js` – assigns P1/P2/P3 and validates requisitions (FR-001, BR-03/BR-04).
- `src/allocation.js` – priority-ordered, stock-limited allocation with partial allocations and shortfalls (FR-002, BR-05/BR-06).
- `src/volunteers.js` – skill, verification and availability matching, nearest first (FR-003, BR-07).
- `src/deliveries.js` – delivery status machine, assigned-volunteer check and overdue detection (FR-004, BR-08/BR-09).
- `src/server.js` – REST API with token authentication, verified-user and role checks (NFR-002, BR-01/BR-02).
- All 24 tests pass with `npm test` (Node 18 or later): 17 unit tests for the logic, 7 API tests.
- Limitations: data is stored in memory, so with PostgreSQL the allocation must run as one database transaction (`SELECT ... FOR UPDATE` on inventory) to prevent double allocation. Audit logging, offline sync, reporting and delivery-confirmation updates to requisitions are not implemented yet (TC-07, TC-11, TC-12, TC-13, TC-14, TC-17 stay "Planned" in the RTM). Partially allocated requisitions are not re-queued when new stock arrives.
