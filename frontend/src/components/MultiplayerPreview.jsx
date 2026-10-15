
import { useState } from "react";
import {
  OFFICE_WIDTH,
  OFFICE_HEIGHT,
  AVATAR_SIZE,
  createAvatar,
} from "../utils/avatarUtils";

const initialAvatars = [
  createAvatar("user_101", 100, 150),
  createAvatar("user_102", 300, 220),
  createAvatar("user_103", 500, 120),
];

const avatarColors = ["#2563eb", "#16a34a", "#9333ea"];

export default function MultiplayerPreview() {
  const [avatars, setAvatars] = useState(initialAvatars);

  function moveSampleAvatar(userId, dx, dy) {
    setAvatars((currentAvatars) =>
      currentAvatars.map((avatar) => {
        if (avatar.userId !== userId) return avatar;

        return createAvatar(
          avatar.userId,
          avatar.x + dx,
          avatar.y + dy
        );
      })
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h2>ProxiSpeak — Multiplayer Preview</h2>
      <p>
        This is a local demonstration using sample avatars.
        The avatars are not connected to other users.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {avatars.map((avatar, index) => (
          <button
            key={avatar.userId}
            onClick={() => moveSampleAvatar(avatar.userId, 20, 0)}
          >
            Move {avatar.userId}
          </button>
        ))}
      </div>

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
        {avatars.map((avatar, index) => (
          <div
            key={avatar.userId}
            title={avatar.userId}
            style={{
              position: "absolute",
              left: avatar.x,
              top: avatar.y,
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: "50%",
              background: avatarColors[index],
            }}
          />
        ))}
      </div>

      <ul>
        {avatars.map((avatar) => (
          <li key={avatar.userId}>
            {avatar.userId}: X={Math.round(avatar.x)}, Y=
            {Math.round(avatar.y)}
          </li>
        ))}
      </ul>
    </main>
  );
}
