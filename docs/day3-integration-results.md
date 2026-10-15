# Day 3 Deliverable — MongoDB Atlas & Integration Testing Report

**Role:** Member 4 — MongoDB Atlas, Schemas & Integration Testing  
**Project:** ProxiSpeak — Geospatial Proximity Audio Ecosystem  
**Date:** October 15, 2026  
**Status:** ✅ Fully Verified & Documented (All Tests Passing)  

---

## 1. Executive Summary

All Day 3 deliverables, schema validations, and integration tests have been completed and verified across both backend and database packages:
- **MongoDB Atlas Connection**: Confirmed live connection to cluster `ac-6nq1jw8-shard-00-01.w15le4t.mongodb.net` (`proxispeak` database) with `.env` credential management and timeout protection.
- **Office & Coordinate Alignment**: Verified that office dimensions (800×500) and coordinate ranges (`0 <= x <= 800`, `0 <= y <= 500`) exactly match the frontend canvas specifications.
- **Schemas Enforced**: Verified `Presence` schema (with `userId`, `officeId`, `x`, `y`, `isOnline`, `lastSeen`) and `Office` schema (with office dimensions and obstacle definitions: walls, desks, meeting rooms).
- **Integration Test Plan**: Executed all 6 test scenarios with automated headless Socket.IO clients; all 6 passed cleanly.
- **Bug Fixes & Retesting**: All identified syntax errors, missing components, reference errors, and dependency gaps resolved and verified.

---

## 2. Task 1 & 2: Database Operations & Schema Verification

### Presence Schema Fields
- `userId` (String, required, indexed)
- `officeId` (String, required, indexed)
- `x` (Number, required, `min: 0`, `max: 800`)
- `y` (Number, required, `min: 0`, `max: 500`)
- `isOnline` (Boolean, default: `true`)
- `lastSeen` (Date, default: `Date.now`)
- Compound unique index: `{ officeId: 1, userId: 1 }`

### Office Layout Schema Fields
- `officeId` (String, required, unique)
- `name` (String, required)
- `width` (Number, default: `800`)
- `height` (Number, default: `500`)
- `obstacles` (Array of obstacle sub-documents: `{ obstacleId, type, label, x, y, width, height }`)

---

## 3. Task 3: Integration Test Matrix

| # | Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| **1** | Two users join the same office | Both appear | Both appear in `presence:update` lists on each client | **PASS** ✅ |
| **2** | A user moves | Other clients receive the new position | Client B received updated position `(320, 240)` from User A | **PASS** ✅ |
| **3** | Multiple users move together | Each avatar remains independent | Independent positions preserved: User A = `(150, 120)`, User B = `(450, 380)` | **PASS** ✅ |
| **4** | A user disconnects | Their avatar disappears | Client A received `user:left` event for `user_B` and removed avatar | **PASS** ✅ |
| **5** | Invalid coordinates are sent | Server rejects them | Server caught invalid coordinates `(1200, -90)` and emitted `error:invalid_coordinates` | **PASS** ✅ |
| **6** | Database connection fails | Backend reports the failure | Backend caught error: `"getaddrinfo ENOTFOUND nonexistent-host-test..."` with timeout | **PASS** ✅ |

---

## 4. Console Evidence

### A. Live MongoDB Atlas & Schema Test Suite (`npm run test-db`)
```text
================================================================
    ProxiSpeak Member 4 — MongoDB Atlas & Schema Test Suite     
================================================================

Test 1: Connecting to MongoDB Atlas...
[MongoDB] Connected successfully to: ac-6nq1jw8-shard-00-01.w15le4t.mongodb.net
[MongoDB] Active database: proxispeak
✅ PASS: Connected to MongoDB Atlas cluster.

Test 2: Inserting valid Presence document...
✅ PASS: Document inserted with ID: 6ad11972d6ec9a14d4c514ce
   userId: test-user-1792088434156, officeId: office_1
   x: 350, y: 220, isOnline: true
   lastSeen: 2026-10-15T18:20:34.156Z

Test 3: Reading document back and validating coordinates...
✅ PASS: Coordinates accurately verified: (350, 220)

Test 4: Testing schema validation on invalid inputs...
   ✓ Correctly rejected: Negative X coordinate (-20)
   ✓ Correctly rejected: X coordinate exceeding office boundary (850 > 800)
   ✓ Correctly rejected: Negative Y coordinate (-5)
   ✓ Correctly rejected: Y coordinate exceeding office boundary (550 > 500)
   ✓ Correctly rejected: Missing required officeId
   ✓ Correctly rejected: Missing required userId
✅ PASS: All invalid input cases were rejected by schema validation.

Test 5: Verifying Office Layout model with obstacles...
✅ PASS: Office layout created and verified:
   officeId: office-test-1792088434372, dimensions: 800x500
   obstacles count: 2 (North Dividing Wall, Dev Cluster A)

Test 6: Cleaning up test artifacts...
✅ PASS: Temporary test documents removed from Atlas.

================================================================
 🎉 ALL 6/6 DATABASE TESTS PASSED SUCCESSFULLY!
================================================================
```

### B. Integration Test Suite (`npm run test-integration`)
```text
================================================================
      ProxiSpeak Day 3 — Integration Testing Test Suite        
================================================================

[Test Server] Running on http://localhost:52987

--- Scenario 1: Two users join the same office ---
[Socket] User connected: HE1SkwN1BO_N61nyAAAA
[Socket] User connected: nmERfFARqkOXUAHNAAAB
Result: ✅ PASS

--- Scenario 2: A user moves ---
Result: ✅ PASS

--- Scenario 3: Multiple users move together ---
Result: ✅ PASS

--- Scenario 4: A user disconnects ---
[Socket] User disconnected: nmERfFARqkOXUAHNAAAB
Result: ✅ PASS

--- Scenario 5: Invalid coordinates are sent ---
Invalid movement coordinates: HE1SkwN1BO_N61nyAAAA { x: 1200, y: -90 }
Result: ✅ PASS

--- Scenario 6: Database connection fails ---
[Socket] User disconnected: HE1SkwN1BO_N61nyAAAA
Result: ✅ PASS

================================================================
                INTEGRATION TEST RESULTS SUMMARY                
================================================================

┌─────────┬──────────────────────────────────┬──────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────┬──────────┐
│ (index) │ Test                             │ Expected Result                          │ Actual Result                                                            │ Status   │
├─────────┼──────────────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┼──────────┤
│ 0       │ 'Two users join the same office' │ 'Both appear'                            │ 'Both appear in presence:update lists on each client'                    │ 'PASSED' │
│ 1       │ 'A user moves'                   │ 'Other clients receive the new position' │ 'Other client received updated position (320, 240)'                      │ 'PASSED' │
│ 2       │ 'Multiple users move together'   │ 'Each avatar remains independent'        │ 'Independent positions preserved: User A=(150, 120), User B=(450, 380)'  │ 'PASSED' │
│ 3       │ 'A user disconnects'             │ 'Their avatar disappears'                │ "Client received 'user:left' event for user_B"                           │ 'PASSED' │
│ 4       │ 'Invalid coordinates are sent'   │ 'Server rejects them'                    │ "Server caught invalid coords and emitted 'error:invalid_coordinates'"   │ 'PASSED' │
│ 5       │ 'Database connection fails'      │ 'Backend reports the failure'            │ 'Backend caught error: "getaddrinfo ENOTFOUND nonexistent-host-test..."' │ 'PASSED' │
└─────────┴──────────────────────────────────┴──────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────┴──────────┘

🎉 ALL 6 INTEGRATION TEST SCENARIOS PASSED SUCCESSFULLY!
```

---

## 5. Bug Register, Assignments & Retest Results

| Bug ID | Description | Root Cause | Assigned Member | Resolution & Retest Result |
|---|---|---|---|---|
| **BUG-01** | Syntax error in `RealtimeAvatarDemo.jsx` | Stray `bu*` token at line 1 causing compilation failure | **Member 2** (Frontend) | **Resolved**: Removed token and repaired character encoding. Vite production build passed with 0 errors. |
| **BUG-02** | Missing `OfficeCanvas.jsx` component | Component imported by `RealtimeAvatarDemo.jsx` was not created | **Member 2** (Frontend) | **Resolved**: Implemented `OfficeCanvas.jsx` supporting 800×500 canvas grid, office zones, and avatar rendering. |
| **BUG-03** | `ReferenceError: isValidOfficeId is not defined` | `socketHandlers.js` checked `!isValidOfficeId(officeId)` without defining the helper | **Member 1** (Backend) | **Resolved**: Defined `isValidOfficeId` supporting flexible office IDs. Retested: Scenario 1 & 3 passed cleanly. |
| **BUG-04** | Variable scope error in MongoDB persistence hook | `initialX` and `initialY` were referenced in asynchronous write hook without being defined | **Member 4** (Database) | **Resolved**: Correctly mapped coordinates to `posX` and `posY`. Non-blocking DB write executes without errors. |
| **BUG-05** | Missing `dotenv` in `database/` package | Running `node src/test-db.js` in `database/` failed with `Cannot find module 'dotenv'` | **Member 4** (Database) | **Resolved**: Installed dependencies via `npm install`. Database tests now pass 100%. |
| **BUG-06** | Accidental file `tatus` in repository root | Typo from terminal command execution | **Member 4** (Database) | **Resolved**: Removed erroneous file and verified clean git state. |
