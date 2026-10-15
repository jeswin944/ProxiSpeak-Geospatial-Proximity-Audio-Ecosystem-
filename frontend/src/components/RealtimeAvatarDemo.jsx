import { useEffect, useState, useRef } from "react";
import { socket } from "../socket";
import OfficeCanvas from "./OfficeCanvas";

const OFFICE_WIDTH = 800;
const OFFICE_HEIGHT = 500;
const AVATAR_SIZE = 24;
const MOVEMENT_SPEED = 200;

const MOVEMENT_KEYS = [
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
];

export default function RealtimeAvatarDemo() {
  // Generate or retrieve a persistent session userId for this browser tab
  const [userId] = useState(() => {
    let stored = sessionStorage.getItem("proxispeak_uid");
    if (!stored) {
      stored = `user_${Math.floor(100 + Math.random() * 900)}`;
      sessionStorage.setItem("proxispeak_uid", stored);
    }
    return stored;
  });

  const officeId = "office_1";

  const [position, setPosition] = useState({
    x: 100 + Math.floor(Math.random() * 200),
    y: 100 + Math.floor(Math.random() * 150),
  });

  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const positionRef = useRef(position);
  positionRef.current = position;

  // Socket.IO connection and presence synchronization
  useEffect(() => {
    function handleConnect() {
      setConnected(true);
      socket.emit("user:join", {
        userId,
        officeId,
        x: positionRef.current.x,
        y: positionRef.current.y,
      });
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handlePresenceUpdate(data) {
      const incomingUsers = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : [];

      setUsers((prevUsers) => {
        const userMap = new Map(prevUsers.map((u) => [u.userId, u]));

        incomingUsers.forEach((u) => {
          if (u && typeof u.userId === "string" && Number.isFinite(u.x) && Number.isFinite(u.y)) {
            userMap.set(u.userId, {
              ...userMap.get(u.userId),
              ...u,
              name: u.userId === userId ? "You" : u.userId,
            });
          }
        });

        return Array.from(userMap.values());
      });
    }

    function handleUserLeft(data) {
      const leftUserId = typeof data === "string" ? data : data?.userId;
      if (!leftUserId) return;

      setUsers((prevUsers) => prevUsers.filter((u) => u.userId !== leftUserId));
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("user:left", handleUserLeft);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("user:left", handleUserLeft);
      socket.disconnect();
    };
  }, [userId, officeId]);

  // Keep own avatar in users list synchronized with local movement
  useEffect(() => {
    setUsers((prevUsers) => {
      const exists = prevUsers.some((u) => u.userId === userId);
      if (!exists) {
        return [
          ...prevUsers,
          { userId, name: "You", x: position.x, y: position.y },
        ];
      }
      return prevUsers.map((u) =>
        u.userId === userId ? { ...u, x: position.x, y: position.y } : u
      );
    });
  }, [position, userId]);

  // Smooth continuous keyboard movement with diagonal normalization
  useEffect(() => {
    const keysPressed = new Set();
    let animFrameId;
    let prevTime = 0;
    let lastSent = { x: position.x, y: position.y };

    function handleKeyDown(e) {
      const key = e.key.toLowerCase();
      if (!MOVEMENT_KEYS.includes(key)) return;
      e.preventDefault();
      keysPressed.add(key);
    }

    function handleKeyUp(e) {
      keysPressed.delete(e.key.toLowerCase());
    }

    function handleBlur() {
      keysPressed.clear();
    }

    function loop(time) {
      if (prevTime === 0) prevTime = time;
      const delta = Math.min((time - prevTime) / 1000, 0.05);
      prevTime = time;

      let dx = 0;
      let dy = 0;

      if (keysPressed.has("w") || keysPressed.has("arrowup")) dy -= 1;
      if (keysPressed.has("s") || keysPressed.has("arrowdown")) dy += 1;
      if (keysPressed.has("a") || keysPressed.has("arrowleft")) dx -= 1;
      if (keysPressed.has("d") || keysPressed.has("arrowright")) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;

        const moveX = dx * MOVEMENT_SPEED * delta;
        const moveY = dy * MOVEMENT_SPEED * delta;

        setPosition((curr) => {
          const next = {
            x: Math.max(0, Math.min(OFFICE_WIDTH - AVATAR_SIZE, curr.x + moveX)),
            y: Math.max(0, Math.min(OFFICE_HEIGHT - AVATAR_SIZE, curr.y + moveY)),
          };

          if (
            socket.connected &&
            (Math.abs(next.x - lastSent.x) >= 2 || Math.abs(next.y - lastSent.y) >= 2)
          ) {
            socket.emit("avatar:move", {
              userId,
              officeId,
              x: Math.round(next.x),
              y: Math.round(next.y),
            });
            lastSent = { x: next.x, y: next.y };
          }

          return next;
        });
      }

      animFrameId = requestAnimationFrame(loop);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    animFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      cancelAnimationFrame(animFrameId);
    };
  }, [userId, officeId]);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        maxWidth: 900,
        margin: "0 auto",
        color: "#f1f5f9",
        background: "#0b0f19",
        minHeight: "100vh",
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#38bdf8" }}>
          ProxiSpeak — Geospatial Office Multiplayer
        </h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
          Real-time movement broadcast with MongoDB Atlas geospatial persistence.
        </p>
      </header>

      {/* Status Bar */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          background: "#1e293b",
          padding: "10px 16px",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          border: "1px solid #334155",
        }}
      >
        <div>
          Status:{" "}
          <strong style={{ color: connected ? "#4ade80" : "#f87171" }}>
            {connected ? "● Connected to Atlas" : "○ Disconnected"}
          </strong>
        </div>
        <div>
          Office: <strong style={{ color: "#e2e8f0" }}>{officeId}</strong>
        </div>
        <div>
          Your User ID: <strong style={{ color: "#38bdf8" }}>{userId}</strong>
        </div>
        <div>
          Users in Office: <strong style={{ color: "#a78bfa" }}>{users.length}</strong>
        </div>
        <div>
          Coords:{" "}
          <strong style={{ color: "#fbbf24" }}>
            ({Math.round(position.x)}, {Math.round(position.y)})
          </strong>
        </div>
      </div>

      {/* Office Canvas */}
      <OfficeCanvas users={users} currentUserId={userId} />

      {/* Controls & Instructions */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: "#1e293b",
          borderRadius: 8,
          fontSize: 13,
          color: "#94a3b8",
          border: "1px solid #334155",
        }}
      >
        <strong style={{ color: "#e2e8f0" }}>Controls:</strong> Hold <kbd>W</kbd>, <kbd>A</kbd>, <kbd>S</kbd>, <kbd>D</kbd> or the Arrow keys to move. Open this page in a second browser window to see multiplayer avatars move together in real-time.
      </div>
    </main>
  );
}
