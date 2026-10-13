
export const OFFICE_WIDTH = 800;
export const OFFICE_HEIGHT = 500;
export const AVATAR_SIZE = 20;
export const MOVEMENT_SPEED = 180;

// Keep the avatar inside the office boundaries.
export function clampPosition(x, y) {
  return {
    x: Math.max(0, Math.min(OFFICE_WIDTH - AVATAR_SIZE, x)),
    y: Math.max(0, Math.min(OFFICE_HEIGHT - AVATAR_SIZE, y)),
  };
}

// Create a consistent position object for local and remote avatars.
export function createAvatar(userId, x = 100, y = 100) {
  const position = clampPosition(x, y);

  return {
    userId,
    x: position.x,
    y: position.y,
  };
}

// Validate incoming position data before using it.
export function isValidAvatarPosition(data) {
  return (
    data !== null &&
    typeof data === "object" &&
    typeof data.userId === "string" &&
    Number.isFinite(data.x) &&
    Number.isFinite(data.y)
  );
}
