# ProxiSpeak Data Schemas & MongoDB Connection Plan (Day 1 Deliverable)

**Role:** Member 4 — Database Architect & Schema Engineer  
**Deliverable Status:** Complete  
**Ecosystem Alignment:** 
- **Backend (Member 1):** Shared Mongoose connection strings, models, and `.env` specifications.
- **Frontend / Canvas (Member 2):** Coordinate boundaries strictly calibrated to **800 × 500 units**.
- **Spatial Audio (Member 3):** Spatial coordinates $(x, y)$ indexed for low-latency proximity queries.

---

## 1. MongoDB Atlas Setup & Connection Plan

### A. Atlas Configuration Steps
1. **Cluster Creation**: Set up a free-tier M0 cluster (or local MongoDB Community Server `mongodb://127.0.0.1:27017/proxispeak`).
2. **Database User**:
   - Create a dedicated user (e.g., `proxispeak-admin`).
   - Assign `readWriteAnyDatabase` or `dbOwner` privilege.
   - Use a secure password (avoid special characters that require percent-encoding like `@`, `:`, `/`, or percent-encode them).
3. **Network Access (IP Whitelist)**:
   - For development: Add `0.0.0.0/0` (Allow Access from Anywhere) or add developers' specific current public IP addresses.
4. **Connection String Format**:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-address>.mongodb.net/proxispeak?retryWrites=true&w=majority
   ```
5. **Security Rules**:
   - Never commit `.env` containing credentials to Git.
   - `.gitignore` is in place in both `database/` and `backend/`.
   - `.env.example` is committed with placeholder values.

---

## 2. Data Schemas

### Schema 1: Presence (`Presence.js`)
Tracks real-time spatial positioning of active users within office rooms.

```
Presence
├── userId (String, required)
├── officeId (String, required)
├── x (Number, 0 to 800, required)
├── y (Number, 0 to 500, required)
├── isOnline (Boolean, default: true)
└── lastSeen (Date, default: Date.now)
```

- **Compound Index:** `{ officeId: 1, userId: 1 }` (unique). Ensures one active coordinate record per user per office and enables millisecond-level proximity lookups.
- **Boundaries:** Matches Member 2's 800 × 500 HTML5 canvas dimensions:
  - `min: 0, max: 800` for `x`
  - `min: 0, max: 500` for `y`

---

### Schema 2: Office Layout (`Office.js`)
Defines the architectural dimensions and collision/obstacle geometries of a virtual workspace.

```
Office
├── officeId (String, unique, indexed)
├── name (String, required)
├── width (Number, default: 800)
├── height (Number, default: 500)
├── obstacles [Array]
│   ├── obstacleId (String, required)
│   ├── type (String: 'wall' | 'desk' | 'meeting_room' | 'lounge' | 'door' | 'custom')
│   ├── label (String)
│   ├── x (Number, 0 to 800)
│   ├── y (Number, 0 to 500)
│   ├── width (Number)
│   └── height (Number)
├── createdAt (Date)
└── updatedAt (Date)
```

---

### Schema 3: User (`User.js`)
Stores persistent profile metadata across office sessions.

```
User
├── userId (String, unique, indexed)
├── username (String, required)
├── email (String)
├── avatarColor (String, hex code)
├── currentOfficeId (String)
└── createdAt (Date)
```

---

## 3. How to Test the Database Connection (Step 5)

Run the test suite from the `database/` directory:

```bash
cd database
npm run test-db
```

This automated test script:
1. Connects to the database specified in `.env`.
2. Inserts a sample `Presence` document with center-office coordinates `(x: 400, y: 250)` readiness.
3. Queries and verifies the document against MongoDB.
4. Cleans up test data and disconnects cleanly.
