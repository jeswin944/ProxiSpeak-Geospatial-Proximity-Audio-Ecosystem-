import { useEffect, useState } from "react";
import { socket } from "../socket";

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

export default function RealtimeAvatarDemo() {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [connected, setConnected] = useState(false);

  // Temporary identity for frontend testing.
  // Replace with the authenticated user's ID later.
  const userId = "demo-user-1";
  const officeId = "office-1";

  // Socket.IO connection and presence events.
  useEffect(() => {
    function handleConnect() {
      setConnected(true);

      socket.emit("user:join", {
        userId,
        officeId,
        x: position.x,
        y: position.y,
      });
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handlePresenceUpdate(data) {
      console.log("Presence update received:", data);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("presence:update", handlePresenceUpdate);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("presence:update", handlePresenceUpdate);
      socket.disconnect();
    };
  }, []);

  // Support simultaneous keyboard presses and smooth movement.
  useEffect(() => {
    const keysPressed = new Set();

    let animationFrameId;
    let previousTime = 0;
    let lastSentPosition = { x: 100, y: 100 };

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();

      if (!MOVEMENT_KEYS.includes(key)) return;

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
        const length = Math.sqrt(dx * dx + dy * dy);

        dx /= length;
        dy /= length;

        const movementX = dx * MOVEMENT_SPEED * deltaTime;
        const movementY = dy * MOVEMENT_SPEED * deltaTime;

        setPosition((current) => {
          const next = {
            x: Math.max(
              0,
              Math.min(
                OFFICE_WIDTH - AVATAR_SIZE,
                current.x + movementX
              )
            ),
            y: Math.max(
              0,
              Math.min(
                OFFICE_HEIGHT - AVATAR_SIZE,
                current.y + movementY
              )
            ),
          };

          // Emit only when the position changes.
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

            lastSentPosition = { x: next.x, y: next.y };
          }

          return next;
        });
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
  }, []);

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

      <div
        style={{
          position: "relative",
          width: "min(800px, 100%)",
          aspectRatio: "8 / 5",
          border: "2px solid #64748b",
          borderRadius: 12,
          backgroundColor: "#f1f5f9",
          backgroundImage:
            "linear-gradient(#dbe3ed 1px, transparent 1px), linear-gradient(90deg, #dbe3ed 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${(position.x / OFFICE_WIDTH) * 100}%`,
            top: `${(position.y / OFFICE_HEIGHT) * 100}%`,
            width: `${(AVATAR_SIZE / OFFICE_WIDTH) * 100}%`,
            aspectRatio: "1",
            borderRadius: "50%",
            backgroundColor: "#2563eb",
            border: "2px solid white",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.4)",
          }}
          title="Your avatar"
        />
      </div>

      <p>
        Position: X = {Math.round(position.x)}, Y ={" "}
        {Math.round(position.y)}
      </p>

      {!connected && (
        <p>
          Local movement is available. Multiplayer requires the
          backend to be running and the Socket.IO events to match.
        </p>
      )}
    </main>
  );
}