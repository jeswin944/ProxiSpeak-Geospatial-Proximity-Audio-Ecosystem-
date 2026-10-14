Jeswin
# ProxiSpeak — Geospatial Proximity Audio Ecosystem

**ProxiSpeak** is a real-time virtual office ecosystem combining interactive 2D canvas navigation with geospatial proximity audio. Avatars move across a virtual office space, where spatial audio volume, stereo panning, and voice clarity dynamically adjust based on user distance and layout obstacles.

---

## 🌟 Key Features & Architecture

* **Spatial Proximity Audio**: Dynamic distance attenuation and positional panning powered by the Web Audio API / WebRTC.
* **Synchronized 2D Canvas**: Real-time virtual office canvas measuring **800 × 500 units**, supporting obstacle collisions and multi-user avatar movement.
* **Low-Latency Presence Indexing**: MongoDB Atlas compound indexing on `{ officeId: 1, userId: 1 }` ensuring millisecond-level coordinate lookups.
* **Modular Ecosystem Architecture**: Decoupled modules across Frontend, Backend, Spatial Audio, and Database.

---

## 👥 Team Responsibilities & Day 1 Deliverables

| Member | Focus Area | Responsibilities & Status |
| :--- | :--- | :--- |
| **Member 1** | **Backend & Signaling** | Node.js / Express server, WebRTC signaling, WebSocket presence coordination. |
| **Member 2** | **Frontend & Canvas** | Interactive HTML5 Canvas (800 × 500), avatar movement, obstacle rendering. |
| **Member 3** | **Spatial Audio Engine** | Web Audio API integration, distance-decay volume curve, spatial audio zones. |
| **Member 4** | **Database & Schemas** | **[Complete]** MongoDB Atlas setup, Mongoose schemas (`Presence`, `Office`, `User`), connection plan, automated test suite. |

---

## 🗄️ Database Models & Schemas

### 1. Presence Schema (`database/src/models/Presence.js`)
Tracks real-time avatar coordinates inside a specific office space. Strictly bounded to match the Canvas dimensions ($800 \times 500$ units).

```javascript
{
  userId: String,       // Unique user identifier (Required)
  officeId: String,     // Target office room ID (Required)
  x: Number,            // Coordinate along width (0 to 800)
  y: Number,            // Coordinate along height (0 to 500)
  isOnline: Boolean,    // Real-time connectivity status (default: true)
  lastSeen: Date        // Timestamp of latest heartbeat
}
```
* **Compound Index:** `{ officeId: 1, userId: 1 }` (unique) for fast position updates and proximity range queries.

### 2. Office Layout Schema (`database/src/models/Office.js`)
Stores office geometry, boundary configurations, and obstacle barriers.

```text
Office
├── officeId (String, unique, indexed)
├── name (String)
├── width (Number, default: 800)
├── height (Number, default: 500)
└── obstacles [Array]
    ├── obstacleId (String)
    ├── type ('wall' | 'desk' | 'meeting_room' | 'lounge' | 'door' | 'custom')
    ├── label (String)
    ├── x (0 to 800)
    ├── y (0 to 500)
    ├── width (Number)
    └── height (Number)
```

### 3. User Schema (`database/src/models/User.js`)
Persistent user profile information and styling metadata.

```javascript
{
  userId: String,          // Unique ID (Required, indexed)
  username: String,        // Display name
  email: String,           // Optional email
  avatarColor: String,     // Hex color code (e.g., #4F46E5)
  currentOfficeId: String  // Last joined office room
}
```

---

## 📂 Repository Structure

```text
ProxiSpeak-Geospatial-Proximity-Audio-Ecosystem/
├── backend/
│   ├── src/
│   │   └── models/
│   │       └── Presence.js     # Shared model copy for backend
│   ├── .env.example            # Backend environment template
│   └── .gitignore              # Ignores backend secrets
├── database/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Office.js       # Office layout & obstacle schema
│   │   │   ├── Presence.js     # Live coordinates schema
│   │   │   ├── User.js         # User profile schema
│   │   │   └── index.js        # Model bundle exports
│   │   ├── db.js               # Reusable Mongoose connection manager
│   │   └── test-db.js          # Automated Atlas test script
│   ├── index.js                # Database package entry point
│   ├── package.json            # Database scripts & dependencies
│   ├── SCHEMAS.md              # Detailed schema design documentation
│   ├── .env.example            # Database environment template
│   └── .gitignore              # Protects live credentials
├── frontend/                   # Canvas UI & avatar navigation (Member 2)
├── docs/                       # Architectural specs & agreements
└── README.md                   # Main ecosystem documentation
```

---

## 🚀 Quickstart & Database Verification

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [MongoDB Atlas](https://cloud.mongodb.com/) account or local MongoDB instance

### 2. Environment Configuration
Copy the template file to `.env` inside the `database/` directory:

```bash
cd database
cp .env.example .env
```

Ensure `MONGODB_URI` contains your connection credentials:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.w15le4t.mongodb.net/proxispeak?retryWrites=true&w=majority
```

> **Security Note:** Never commit `.env` files containing live credentials. Both `database/` and `backend/` have `.gitignore` configured.

### 3. Run Verification Tests
Test connectivity, document insertion, boundary validation, and cleanup:

```bash
cd database
npm run test-db
```

Expected output:
```text
==================================================
   ProxiSpeak Database Connection & Schema Test   
==================================================
[MongoDB] Connecting to MongoDB...
[MongoDB] Connected successfully to host: ...
[MongoDB] Active Database: proxispeak
✅ Step 1: MongoDB is reachable and connected!
📝 Step 2: Inserting sample Presence document...
✅ Document successfully inserted!
🔍 Step 3: Querying the document back from MongoDB...
✅ Document successfully retrieved:
🧹 Step 4: Cleaning up test document...
✅ Cleanup complete.
🎉 ALL CHECKS PASSED: Database connection and Presence schema are fully operational!
==================================================
```

---

## 📑 Next Steps (Day 2 Deliverables)
1. **Member 1 (Backend)**: Wire Socket.io position events directly to `Presence.updateOne()` with upsert enabled.
2. **Member 2 (Frontend)**: Connect Canvas avatar coordinate listeners (`mousemove`/`wasd`) to backend socket emitters.
3. **Member 3 (Spatial Audio)**: Consume coordinate streams to calculate euclidean distance $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$ for Web Audio gain control.
4. **Member 4 (Database)**: Implement seed layouts for `Office` with collision walls and meeting zones.
=======
 main
