import { useEffect, useState } from "react";
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

export default function RealtimeAvatarDemo() {
  const userId = "demo-user-1";
  const officeId = "office-1";

  const [position, setPosition] = useState({
    x: 100,
    y: 100,
  });

  const [connected, setConnected] = useState(false);

  // Temporary second avatar for testing the canvas.
  // This is NOT a real connected user.
  const [users, setUsers] = useState([
    {
      userId: "demo-user-1",
      name: "You",
      x: 100,
      y: 100,
    },
    {
      userId: "demo-user-2",
      name: "Demo User",
      x: 300,
      y: 200,
    },
  ]);

  // Keep the current user's entry synchronized with movement.
  useEffect(() => {
    setUsers((previousUsers) => {
      const exists = previousUsers.some(
        (user) => user.userId === userId
      );

      if (!exists) {
        return [
          ...previousUsers,
          {
            userId,
            name: "You",
            x: position.x,
            y: position.y,
          },
        ];
      }

      return previousUsers.map((user) =>
        user.userId === userId
          ? {
              ...user,
              x: position.x,
              y: position.y,
            }
          : user
      );
    });
  }, [position.x, position.y, userId]);

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

      // Support either an array or an object containing users.
      const incomingUsers = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : [];

      setUsers((previousUsers) => {
        const nextUsers = new Map(
          previousUsers.map((user) => [user.userId, user])
        );

        incomingUsers.forEach((user) => {
          if (
            user &&
            typeof user.userId === "string" &&
            Number.isFinite(user.x) &&
            Number.isFinite(user.y)
          ) {
            nextUsers.set(user.userId, {
              ...nextUsers.get(user.userId),
              ...user,
            });
          }
        });

        return Array.from(nextUsers.values());
      });
    }

    function handleUserLeft(data) {
      const leftUserId =
        typeof data === "string" ? data : data?.userId;

      if (!leftUserId) return;

      setUsers((previousUsers) =>
        previousUsers.filter(
          (user) => user.userId !== leftUserId
        )
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
  }, []);

  // Smooth movement with simultaneous keyboard presses.
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

      const deltaTime = Math.min(
        (time - previousTime) / 1000,
        0.05
      );

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

            lastSentPosition = {
              x: next.x,
              y: next.y,
            };
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
      <h1>ProxiSpeak â€” Avatar Movement</h1>

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

      <OfficeCanvas
        users={users}
        currentUserId={userId}
      />

      <p>
        Position: X = {Math.round(position.x)}, Y ={" "}
        {Math.round(position.y)}
      </p>

      {!connected && (
        <p>
          Local movement is available. Real multiplayer requires
          the backend and matching Socket.IO events.
        </p>
      )}
    </main>
  );
}
