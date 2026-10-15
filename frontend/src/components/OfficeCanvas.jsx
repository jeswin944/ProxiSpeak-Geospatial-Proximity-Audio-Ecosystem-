import React from "react";
import "./OfficeCanvas.css";

const OFFICE_WIDTH = 800;
const OFFICE_HEIGHT = 500;
const AVATAR_SIZE = 24;

export default function OfficeCanvas({
  users = [],
  currentUserId = "",
}) {
  return (
    <div className="office-canvas">
      <div
        className="office-room"
        style={{
          width: OFFICE_WIDTH,
          height: OFFICE_HEIGHT,
        }}
      >
        {users.map((user) => (
          <div
            key={user.userId}
            className={`office-avatar ${
              user.userId === currentUserId
                ? "current-avatar"
                : "other-avatar"
            }`}
            style={{
              left: Math.max(
                0,
                Math.min(
                  OFFICE_WIDTH - AVATAR_SIZE,
                  user.x
                )
              ),
              top: Math.max(
                0,
                Math.min(
                  OFFICE_HEIGHT - AVATAR_SIZE,
                  user.y
                )
              ),
            }}
            title={user.name || user.userId}
          >
            <span>{user.name || user.userId || "User"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
