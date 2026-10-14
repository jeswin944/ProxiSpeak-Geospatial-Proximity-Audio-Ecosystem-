import { useEffect, useState } from "react";
import { socket } from "../socket";

const OFFICE_WIDTH = 800;
const OFFICE_HEIGHT = 500;
const AVATAR_SIZE = 24;
const SPEED = 10;

export default function RealtimeAvatarDemo() {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [connected, setConnected] = useState(false);

  // Temporary identity for frontend testing.
  // Replace this with your actual logged-in user ID later.
  const userId = "demo-user-1";
  const officeId = "office-1";

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

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Listen for the backend's presence broadcast.
    function handlePresenceUpdate(data) {
      console.log("Presence update received:", data);
      // We'll render other users here once Member 1 confirms
      // the exact presence:update payload format.
    }

    socket.on("presence:update", handlePresenceUpdate);

    // Connect only when the component is mounted.
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("presence:update", handlePresenceUpdate);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const key = event.key.toLowerCase();

      const directions = {
        arrowup: [0, -SPEED],
        w: [0, -SPEED],
        arrowdown: [0, SPEED],
        s: [0, SPEED],
        arrowleft: [-SPEED, 0],
        a: [-SPEED, 0],
        arrowright: [SPEED, 0],
        d: [SPEED, 0],
      };

      const direction = directions[key];
      if (!direction) return;

      event.preventDefault();

      setPosition((current) => {
        const next = {
          x: Math.max(
            0,
            Math.min(
              OFFICE_WIDTH - AVATAR_SIZE,
              current.x + direction[0]
            )
          ),
          y: Math.max(
            0,
            Math.min(
              OFFICE_HEIGHT - AVATAR_SIZE,
              current.y + direction[1]
            )
          ),
        };

        if (socket.connected) {
          socket.emit("avatar:move", {
            userId,
            officeId,
            x: next.x,
            y: next.y,
          });
        }

        return next;
      });
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>ProxiSpeak — Avatar Movement</h1>

      <p>
        Socket status:{" "}
        <strong>{connected ? "Connected" : "Disconnected"}</strong>
      </p>

      <p>Use W, A, S, D or the arrow keys to move your avatar.</p>

      <div
        style={{
          position: "relative",
          width: "min(800px, 100%)",
          aspectRatio: "8 / 5",
          border: "2px solid #64748b",
          borderRadius: 12,
          background: "#f1f5f9",
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
            background: "#2563eb",
            border: "2px solid white",
            boxSizing: "border-box",
          }}
          title="Your avatar"
        />
      </div>

      <p>
        Position: X = {position.x}, Y = {position.y}
      </p>

      {!connected && (
        <p>
          Local movement works, but multiplayer updates require Member 1's
          backend and matching Socket.IO events.
        </p>
      )}
    </main>
  );
}