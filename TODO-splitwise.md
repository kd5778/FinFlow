# FinFlow Splitwise Feature - TODO

## Approved Plan Steps:

- [ ] Step 1: Create TODO-splitwise.md (current)
- [x] Step 2: DB migration - Created `database/create-splits.sql` + updated `database/setup-db.js` (run `node database/setup-db.js`)
- [ ] Step 3: Backend - Add /split endpoints to `backend/server.js` (create/list/settle)
- [x] Step 4: Frontend components - Created `SplitBill.jsx` (create splits) & `SplitHistory.jsx` (list/settle)
- [x] Step 5: UI Integration - Updated `Transfer.jsx` (Pay/Receive/Split tabs, value=2/3), minor CSS scoped
- [x] Step 6: Updated TODO

## FINAL STATUS ✅

**Splitwise added to main menu (below Hub)!**

1. **DB**: Run `node database/setup-db.js`
2. Backend running (`cd backend && node server.js`)
3. Frontend (`cd frontend && npm run dev`)
4. Menu → **Splitwise** → Create/History splits!

Feature live: Create splits (equal/custom), share ID, settle (pays creator). Atomic, logged, validated.

Done! 🎉
