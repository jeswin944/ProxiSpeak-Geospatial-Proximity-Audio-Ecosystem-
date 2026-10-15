
import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import OfficeCanvas from "./OfficeCanvas";

const OFFICE_WIDTH = 800;
const OFFICE_HEIGHT = 500;
const AVATAR_SIZE = 24;
const MOVEMENT_SPEED = 180;

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

const INITIAL_POSITION = { x: 100, y: 100 };

// Keep the same ID during this browser tab's session.
// Different tabs receive different IDs for multiplayer testing.
function getDemoUserId() {
  const key = "proxispeak-demo-user-id";

  let id = sessionStorage.getItem(key);

  if (!id) {
    id =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? `demo-${crypto.randomUUID()}`
        : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    sessionStorage.setItem(key, id);
  }

  return id;
}

export default function RealtimeAvatarDemo() {
  const [userId] = useState(() => getDemoUserId());

  // IMPORTANT: Must match the backend's valid office ID.
  const officeId = "office_1";

  const [position, setPosition] = useState(INITIAL_POSITION);
  const positionRef = useRef(INITIAL_POSITION);

  const [connected, setConnected] = useState(false);

  // Only real users received through local state or Socket.IO are shown.
  const [users, setUsers] = useState([
    {
      userId,
      name: "You",
      ...INITIAL_POSITION,
    },
  ]);

  // Keep a current position reference for socket callbacks.
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Socket.IO connection and real-time presence.
  useEffect(() => {
    function handleConnect() {
      setConnected(true);

      const currentPosition = positionRef.current;

      socket.emit("user:join", {
        userId,
        officeId,
        x: currentPosition.x,
        y: currentPosition.y,
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

      setUsers((previousUsers) => {
        const nextUsers = new Map(
          previousUsers.map((user) => [user.userId, user])
        );

        for (const user of incomingUsers) {
          if (
            !user ||
            typeof user.userId !== "string" ||
            !Number.isFinite(user.x) ||
            !Number.isFinite(user.y)
          ) {
            continue;
          }

          // Ignore users belonging to another office, if provided.
          if (user.officeId && user.officeId !== officeId) {
            continue;
          }

          nextUsers.set(user.userId, {
            ...nextUsers.get(user.userId),
            ...user,
            name:
              user.userId === userId
                ? "You"
                : user.name || "Other User",
          });
        }

        // Ensure the current user's local avatar remains visible.
        const currentPosition = positionRef.current;

        nextUsers.set(userId, {
          ...nextUsers.get(userId),
          userId,
          name: "You",
          x: currentPosition.x,
          y: currentPosition.y,
        });

        return Array.from(nextUsers.values());
      });
    }

    function handleUserLeft(data) {
      const leftUserId =
        typeof data === "string" ? data : data?.userId;

      if (!leftUserId || leftUserId === userId) {
        return;
      }

      setUsers((previousUsers) =>
        previousUsers.filter((user) => user.userId !== leftUserId)
      );
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

  // Smooth movement, including simultaneous WASD/arrow-key presses.
  useEffect(() => {
    const keysPressed = new Set();

    let animationFrameId;
    let previousTime = 0;
    let lastSentPosition = { ...INITIAL_POSITION };

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();

      if (!MOVEMENT_KEYS.includes(key)) {
        return;
      }

      event.preventDefault();
      keysPressed.add(key);
    }

    function handleKeyUp(event) {
      keysPressed.delete(event.key.toLowerCase());
    }

    function handleWindowBlur() {
      keysPressed.clear();
    }

    function updatePosition(time) {
      if (previousTime === 0) {
        previousTime = time;
      }

      const deltaTime = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      let dx = 0;
      let dy = 0;

      if (keysPressed.has("w") || keysPressed.has("arrowup")) {
        dy -= 1;
      }

      if (keysPressed.has("s") || keysPressed.has("arrowdown")) {
        dy += 1;
      }

      if (keysPressed.has("a") || keysPressed.has("arrowleft")) {
        dx -= 1;
      }

      if (keysPressed.has("d") || keysPressed.has("arrowright")) {
        dx += 1;
      }

      if (dx !== 0 || dy !== 0) {
        // Normalize diagonal movement so it is not faster.
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;

        const current = positionRef.current;

        const next = {
          x: Math.max(
            0,
            Math.min(
              OFFICE_WIDTH - AVATAR_SIZE,
              current.x + dx * MOVEMENT_SPEED * deltaTime
            )
          ),
          y: Math.max(
            0,
            Math.min(
              OFFICE_HEIGHT - AVATAR_SIZE,
              current.y + dy * MOVEMENT_SPEED * deltaTime
            )
          ),
        };

        positionRef.current = next;
        setPosition(next);

        // Update the current avatar immediately in the canvas.
        setUsers((previousUsers) =>
          previousUsers.map((user) =>
            user.userId === userId
              ? { ...user, x: next.x, y: next.y }
              : user
          )
        );

        // Send movement to the server only when connected.
        if (
          socket.connected &&
          (Math.abs(next.x - lastSentPosition.x) >= 2 ||
            Math.abs(next.y - lastSentPosition.y) >= 2)
        ) {
          socket.emit("avatar:move", {
            userId,
            officeId,
            x: next.x,
            y: next.y,
          });

          lastSentPosition = { ...next };
        }
      }

      animationFrameId = requestAnimationFrame(updatePosition);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    animationFrameId = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      cancelAnimationFrame(animationFrameId);
    };
  }, [userId, officeId]);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>ProxiSpeak — Avatar Movement</h1>

      <p>
        Socket status:{" "}
        <strong>
          {connected ? "Connected" : "Disconnected"}
        </strong>
      </p>

      <p>
        Use W, A, S, D or the arrow keys. Hold two keys together
        to move diagonally.
      </p>

      <OfficeCanvas users={users} currentUserId={userId} />

      <p>
        Position: X = {Math.round(position.x)}, Y ={" "}
        {Math.round(position.y)}
      </p>

      {!connected && (
        <p>
          Local movement is available. Real multiplayer requires
          the backend server to be running and accepting Socket.IO
          connections.
        </p>
      )}
    </main>
  );
}
