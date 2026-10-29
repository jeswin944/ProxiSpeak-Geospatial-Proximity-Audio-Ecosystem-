/**
 * ProxiSpeak Spatial Audio Utility
 * ES module compatible with React and Vite.
 */

export function calculateDistance(positionA, positionB) {
  if (!positionA || !positionB) {
    throw new Error("Both avatar positions are required.");
  }

  const x1 = Number(positionA.x);
  const y1 = Number(positionA.y);
  const x2 = Number(positionB.x);
  const y2 = Number(positionB.y);

  if (![x1, y1, x2, y2].every(Number.isFinite)) {
    throw new Error("Avatar coordinates must be finite numbers.");
  }

  const dx = x1 - x2;
  const dy = y1 - y2;

  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateVolume(distance, maxDistance = 500) {
  if (!Number.isFinite(distance) || distance < 0) {
    return 0;
  }

  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    return 0;
  }

  if (distance >= maxDistance) {
    return 0;
  }

  return Math.max(0, Math.min(1, 1 - distance / maxDistance));
}