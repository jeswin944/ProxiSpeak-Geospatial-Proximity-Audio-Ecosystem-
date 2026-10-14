import { useEffect, useRef, useState } from "react";

const OFFICE_WIDTH = 800;
const OFFICE_HEIGHT = 500;
const AVATAR_SIZE = 20;
const SPEED = 180; // pixels per second

export default function MovementDemo() {
  const positionRef = useRef({ x: 100, y: 100 });
  const keysRef = useRef(new Set());
  const [position, setPosition] = useState(positionRef.current);

  useEffect(() => {
    let frameId;
    let previousTime;

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        keysRef.current.add(key);
      }
    }

    function handleKeyUp(event) {
      keysRef.current.delete(event.key.toLowerCase());
    }

    function animate(time) {
      if (previousTime !== undefined) {
        const delta = Math.min((time - previousTime) / 1000, 0.05);
        const keys = keysRef.current;
        let { x, y } = positionRef.current;

        if (keys.has("w") || keys.has("arrowup")) y -= SPEED * delta;
        if (keys.has("s") || keys.has("arrowdown")) y += SPEED * delta;
        if (keys.has("a") || keys.has("arrowleft")) x -= SPEED * delta;
        if (keys.has("d") || keys.has("arrowright")) x += SPEED * delta;

        const next = {
          x: Math.max(0, Math.min(OFFICE_WIDTH - AVATAR_SIZE, x)),
          y: Math.max(0, Math.min(OFFICE_HEIGHT - AVATAR_SIZE, y)),
        };

        if (next.x !== positionRef.current.x || next.y !== positionRef.current.y) {
          positionRef.current = next;
          setPosition(next);
        }
      }

      previousTime = time;
      frameId = requestAnimationFrame(animate);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    frameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h2>ProxiSpeak — Avatar Movement</h2>
      <p>
        Position: X={Math.round(position.x)}, Y={Math.round(position.y)}
      </p>
      <p>Hold WASD or the arrow keys to move.</p>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: OFFICE_WIDTH,
          height: OFFICE_HEIGHT,
          boxSizing: "border-box",
          background: "#f3f4f6",
          border: "2px solid #374151",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: position.x,
            top: position.y,
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: "50%",
            background: "#2563eb",
          }}
        />
      </div>
    </main>
  );
}
