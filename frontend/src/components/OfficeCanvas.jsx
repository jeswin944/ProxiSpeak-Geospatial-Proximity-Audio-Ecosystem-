import React, { useEffect, useRef, useCallback } from "react";
import "./OfficeCanvas.css";

export const OFFICE_WIDTH = 800;
export const OFFICE_HEIGHT = 500;
export const AVATAR_SIZE = 24;
export const AUDIO_RANGE = 150; // Proximity threshold in pixels

export default function OfficeCanvas({
  users = [],
  currentUserId = "",
  onMoveAvatar = null,
}) {
  const canvasRef = useRef(null);
  const usersRef = useRef(users);
  const currentUserIdRef = useRef(currentUserId);
  const isDraggingRef = useRef(false);
  const animFrameIdRef = useRef(null);

  // Keep refs synchronized with latest props to avoid re-binding loop
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Coordinate conversion helper: Screen/Client -> Office Space (800x500)
  const getOfficeCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = OFFICE_WIDTH / rect.width;
    const scaleY = OFFICE_HEIGHT / rect.height;

    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;

    // Center avatar on pointer and clamp within valid boundaries
    const clampedX = Math.max(0, Math.min(OFFICE_WIDTH - AVATAR_SIZE, rawX - AVATAR_SIZE / 2));
    const clampedY = Math.max(0, Math.min(OFFICE_HEIGHT - AVATAR_SIZE, rawY - AVATAR_SIZE / 2));

    return { x: clampedX, y: clampedY };
  }, []);

  // Pointer event handlers for click and click-and-drag movement
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return; // Primary button only
    isDraggingRef.current = true;
    const coords = getOfficeCoords(e);
    if (coords && onMoveAvatar) {
      onMoveAvatar(coords.x, coords.y);
    }
    // Capture pointer if available
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  }, [getOfficeCoords, onMoveAvatar]);

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const coords = getOfficeCoords(e);
    if (coords && onMoveAvatar) {
      onMoveAvatar(coords.x, coords.y);
    }
  }, [getOfficeCoords, onMoveAvatar]);

  const handlePointerUp = useCallback((e) => {
    isDraggingRef.current = false;
    if (e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  }, []);

  // Render loop using requestAnimationFrame and HTML5 2D Context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    function render() {
      if (!isRunning) return;

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth || OFFICE_WIDTH;
      const displayHeight = canvas.clientHeight || OFFICE_HEIGHT;

      // Adjust internal buffer size to match DPR without distortion
      const targetWidth = Math.round(OFFICE_WIDTH * dpr);
      const targetHeight = Math.round(OFFICE_HEIGHT * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. Draw Office Floor Background
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT);

      // 2. Draw Office Architectural Grid (25px spacing)
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= OFFICE_WIDTH; x += 25) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, OFFICE_HEIGHT);
      }
      for (let y = 0; y <= OFFICE_HEIGHT; y += 25) {
        ctx.moveTo(0, y);
        ctx.lineTo(OFFICE_WIDTH, y);
      }
      ctx.stroke();

      // 3. Draw Functional Office Zones
      // Zone A: Meeting Pod
      ctx.fillStyle = "rgba(56, 189, 248, 0.05)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 30, 200, 140);
      ctx.fillRect(30, 30, 200, 140);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "600 11px Inter, sans-serif";
      ctx.fillText("MEETING POD A", 42, 50);

      // Zone B: Dev Cluster
      ctx.fillStyle = "rgba(168, 85, 247, 0.05)";
      ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
      ctx.strokeRect(280, 80, 240, 160);
      ctx.fillRect(280, 80, 240, 160);
      ctx.fillStyle = "#c084fc";
      ctx.fillText("DEV CLUSTER HQ", 292, 100);

      // Zone C: Audio Lounge
      ctx.fillStyle = "rgba(34, 197, 94, 0.05)";
      ctx.strokeStyle = "rgba(34, 197, 94, 0.25)";
      ctx.strokeRect(560, 280, 200, 180);
      ctx.fillRect(560, 280, 200, 180);
      ctx.fillStyle = "#4ade80";
      ctx.fillText("AUDIO LOUNGE", 572, 300);

      // 4. Draw Audio Proximity Aura for Current User (Spatial Audio Range Preview)
      const currentUid = currentUserIdRef.current;
      const currentList = usersRef.current || [];
      const myAvatar = currentList.find((u) => u.userId === currentUid);

      if (myAvatar && Number.isFinite(myAvatar.x) && Number.isFinite(myAvatar.y)) {
        const centerX = myAvatar.x + AVATAR_SIZE / 2;
        const centerY = myAvatar.y + AVATAR_SIZE / 2;

        // Subtle gradient aura
        const auraGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          10,
          centerX,
          centerY,
          AUDIO_RANGE
        );
        auraGrad.addColorStop(0, "rgba(56, 189, 248, 0.15)");
        auraGrad.addColorStop(0.7, "rgba(56, 189, 248, 0.05)");
        auraGrad.addColorStop(1, "rgba(56, 189, 248, 0)");

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, AUDIO_RANGE, 0, Math.PI * 2);
        ctx.fill();

        // Dashed range boundary
        ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, AUDIO_RANGE, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      }

      // 5. Draw Avatars from Source of Truth
      currentList.forEach((user) => {
        if (!user || !Number.isFinite(user.x) || !Number.isFinite(user.y)) return;

        const isMe = user.userId === currentUid;
        const radius = AVATAR_SIZE / 2;
        const cx = user.x + radius;
        const cy = user.y + radius;

        // Drop shadow
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        // Avatar Body Circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = isMe ? "#2563eb" : user.avatarColor || "#16a34a";
        ctx.fill();

        // White border ring
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // Inner specular reflection dot
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fill();

        ctx.restore();

        // Name Tag Label
        const labelText = isMe ? "You" : user.name || user.userId || "User";
        ctx.font = "600 11px Inter, system-ui, sans-serif";
        const textMetrics = ctx.measureText(labelText);
        const pillWidth = textMetrics.width + 12;
        const pillHeight = 18;
        const pillX = cx - pillWidth / 2;
        const pillY = cy + radius + 5;

        // Label pill background
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 9);
        ctx.fill();
        ctx.strokeStyle = isMe ? "rgba(56, 189, 248, 0.4)" : "rgba(148, 163, 184, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label text
        ctx.fillStyle = isMe ? "#38bdf8" : "#f1f5f9";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, cx, pillY + pillHeight / 2);
      });

      // 6. Draw Outer Perimeter Office Wall
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, OFFICE_WIDTH - 2, OFFICE_HEIGHT - 2);

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    }

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  return (
    <div className="office-canvas-container">
      <canvas
        ref={canvasRef}
        className="office-html5-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          touchAction: "none",
          cursor: "crosshair",
        }}
        title="Click or drag to move your avatar"
      />
    </div>
  );
}
