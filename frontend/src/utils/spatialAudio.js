/**
 * ProxiSpeak — Spatial Audio Utility (Member 4, Day 1)
 *
 * Pure functions for distance calculation and volume attenuation
 * between avatars in the 800×500 office canvas coordinate system.
 *
 * These operate on pixel-space coordinates — no geographic conversion needed.
 */

/**
 * Calculate the Euclidean distance between two avatar positions.
 *
 * @param {{ x: number, y: number }} a - First avatar position
 * @param {{ x: number, y: number }} b - Second avatar position
 * @returns {number} Euclidean distance in coordinate units (pixels)
 */
export function calculateDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate volume gain based on distance using linear attenuation.
 *
 * Volume drops linearly from 1.0 at distance 0 to 0.0 at maxDistance.
 * Beyond maxDistance the gain is clamped to 0.
 *
 * Expected gains (default maxDistance = 300):
 *   Distance   0  → gain 1.00
 *   Distance  75  → gain 0.75
 *   Distance 150  → gain 0.50
 *   Distance 225  → gain 0.25
 *   Distance 300  → gain 0.00
 *   Distance 400  → gain 0.00
 *
 * @param {number} distance     - Distance between two avatars (≥ 0)
 * @param {number} maxDistance   - Maximum audible distance (default 300)
 * @returns {number} Volume gain in [0, 1]
 */
export function calculateVolume(distance, maxDistance = 300) {
  if (
    !Number.isFinite(distance) ||
    !Number.isFinite(maxDistance) ||
    distance < 0 ||
    maxDistance <= 0 ||
    distance >= maxDistance
  ) {
    return 0;
  }

  return 1 - distance / maxDistance;
}
