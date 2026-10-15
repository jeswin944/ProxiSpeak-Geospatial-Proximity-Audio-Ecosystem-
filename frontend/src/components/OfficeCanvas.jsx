import React from "react";

const OFFICE_WIDTH = 800;
const OFFICE_HEIGHT = 500;
const AVATAR_SIZE = 24;

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
];

function getColorForUser(userId, index) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[colorIndex];
}

export default function OfficeCanvas({ users = [], currentUserId = "" }) {
  // Office sample zones/obstacles for geospatial layout visualization
  const zones = [
    { label: "Meeting Room A", x: 20, y: 20, width: 220, height: 140, color: "rgba(59, 130, 246, 0.08)", border: "#93c5fd" },
    { label: "Lounge & Coffee", x: 560, y: 20, width: 220, height: 140, color: "rgba(16, 185, 129, 0.08)", border: "#a7f3d0" },
    { label: "Open Workstations", x: 200, y: 220, width: 400, height: 240, color: "rgba(139, 92, 246, 0.06)", border: "#c4b5fd" },
  ];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: OFFICE_WIDTH,
        height: OFFICE_HEIGHT,
        boxSizing: "border-box",
        background: "#0f172a",
        borderRadius: 12,
        border: "2px solid #334155",
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
        margin: "16px 0",
      }}
    >
      {/* Background grid pattern */}
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.15, pointerEvents: "none" }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Office Zones / Obstacles */}
      {zones.map((zone, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            left: zone.x,
            top: zone.y,
            width: zone.width,
            height: zone.height,
            backgroundColor: zone.color,
            border: `1.5px dashed ${zone.border}`,
            borderRadius: 8,
            padding: 8,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {zone.label}
          </span>
        </div>
      ))}

      {/* Active Avatars */}
      {users.map((user, idx) => {
        const isCurrent = user.userId === currentUserId;
        const color = user.color || getColorForUser(user.userId || `user-${idx}`, idx);
        const name = user.name || user.userId || `User ${idx + 1}`;

        return (
          <div
            key={user.userId || idx}
            style={{
              position: "absolute",
              left: user.x,
              top: user.y,
              transform: "translate(0, 0)",
              transition: isCurrent ? "none" : "left 0.1s linear, top 0.1s linear",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pointerEvents: "none",
              zIndex: isCurrent ? 20 : 10,
            }}
          >
            {/* Avatar Circle */}
            <div
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: "50%",
                backgroundColor: color,
                border: isCurrent ? "2.5px solid #ffffff" : "2px solid rgba(255,255,255,0.7)",
                boxShadow: isCurrent ? `0 0 16px ${color}` : `0 0 8px rgba(0,0,0,0.5)`,
                boxSizing: "border-box",
              }}
            />
            {/* Name Badge */}
            <span
              style={{
                marginTop: 4,
                fontSize: 11,
                fontWeight: isCurrent ? 700 : 500,
                color: isCurrent ? "#38bdf8" : "#e2e8f0",
                background: "rgba(15, 23, 42, 0.85)",
                padding: "1px 6px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.15)",
                whiteSpace: "nowrap",
              }}
            >
              {name} {isCurrent && "(You)"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
