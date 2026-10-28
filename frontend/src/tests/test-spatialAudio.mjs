/**
 * ProxiSpeak — Spatial Audio Utility Test Suite (Member 4, Day 1)
 *
 * Tests calculateDistance() and calculateVolume() against all specified
 * edge cases: identical positions, axis-aligned, diagonal, boundary,
 * negative, NaN, Infinity, and invalid maxDistance values.
 *
 * Run from repo root:
 *   node frontend/src/tests/test-spatialAudio.mjs
 *
 * spatialAudio.js ships a dual CJS/ESM export so this .mjs runner can
 * consume it via dynamic import across the package-type boundary.
 */

import assert from 'node:assert';

const { calculateDistance, calculateVolume } = await import('../utils/spatialAudio.js');


console.log('================================================================');
console.log('  ProxiSpeak Day 1 — Spatial Audio Utility Test Suite (Member 4)');
console.log('================================================================\n');

const testResults = [];

function recordResult(name, passed, details) {
  testResults.push({
    Test: name,
    Status: passed ? 'PASSED' : 'FAILED',
    Details: details,
  });
  console.log(`${passed ? '✓ PASS' : '✗ FAIL'}: ${name} — ${details}`);
}

// ─────────────────────── calculateDistance Tests ───────────────────────

// Test 1: Identical positions → distance 0
try {
  const d = calculateDistance({ x: 100, y: 200 }, { x: 100, y: 200 });
  assert.strictEqual(d, 0, 'Expected distance 0 for identical positions');
  recordResult('Distance — Identical positions', true, `distance = ${d}`);
} catch (err) {
  recordResult('Distance — Identical positions', false, err.message);
}

// Test 2: Horizontal distance only (Δy = 0)
try {
  const d = calculateDistance({ x: 0, y: 0 }, { x: 100, y: 0 });
  assert.strictEqual(d, 100, 'Expected horizontal distance = 100');
  recordResult('Distance — Horizontal', true, `distance = ${d}`);
} catch (err) {
  recordResult('Distance — Horizontal', false, err.message);
}

// Test 3: Vertical distance only (Δx = 0)
try {
  const d = calculateDistance({ x: 50, y: 10 }, { x: 50, y: 210 });
  assert.strictEqual(d, 200, 'Expected vertical distance = 200');
  recordResult('Distance — Vertical', true, `distance = ${d}`);
} catch (err) {
  recordResult('Distance — Vertical', false, err.message);
}

// Test 4: Diagonal distance (3-4-5 Pythagorean triple: 30-40-50 scaled)
try {
  const d = calculateDistance({ x: 0, y: 0 }, { x: 300, y: 400 });
  assert.strictEqual(d, 500, 'Expected diagonal distance = 500 (300-400-500 triple)');
  recordResult('Distance — Diagonal (3-4-5)', true, `distance = ${d}`);
} catch (err) {
  recordResult('Distance — Diagonal (3-4-5)', false, err.message);
}

// Test 5: Diagonal distance — symmetry (a→b equals b→a)
try {
  const d1 = calculateDistance({ x: 10, y: 20 }, { x: 110, y: 120 });
  const d2 = calculateDistance({ x: 110, y: 120 }, { x: 10, y: 20 });
  assert.strictEqual(d1, d2, 'Distance must be symmetric');
  recordResult('Distance — Symmetry', true, `d(a,b)=${d1} === d(b,a)=${d2}`);
} catch (err) {
  recordResult('Distance — Symmetry', false, err.message);
}

// ─────────────────────── calculateVolume Tests ────────────────────────

// Test 6: Distance 0 → gain 1.00
try {
  const v = calculateVolume(0);
  assert.strictEqual(v, 1, 'Expected gain 1.00 at distance 0');
  recordResult('Volume — Distance 0', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Distance 0', false, err.message);
}

// Test 7: Distance 75 → gain 0.75
try {
  const v = calculateVolume(75);
  assert.strictEqual(v, 0.75, 'Expected gain 0.75 at distance 75');
  recordResult('Volume — Distance 75', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Distance 75', false, err.message);
}

// Test 8: Distance 150 → gain 0.50
try {
  const v = calculateVolume(150);
  assert.strictEqual(v, 0.5, 'Expected gain 0.50 at distance 150');
  recordResult('Volume — Distance 150', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Distance 150', false, err.message);
}

// Test 9: Distance 225 → gain 0.25
try {
  const v = calculateVolume(225);
  assert.strictEqual(v, 0.25, 'Expected gain 0.25 at distance 225');
  recordResult('Volume — Distance 225', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Distance 225', false, err.message);
}

// Test 10: Distance 300 (boundary) → gain 0.00
try {
  const v = calculateVolume(300);
  assert.strictEqual(v, 0, 'Expected gain 0.00 at exact boundary (300)');
  recordResult('Volume — Distance 300 (boundary)', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Distance 300 (boundary)', false, err.message);
}

// Test 11: Distance 400 (beyond max) → gain 0.00
try {
  const v = calculateVolume(400);
  assert.strictEqual(v, 0, 'Expected gain 0.00 beyond maxDistance');
  recordResult('Volume — Distance 400 (beyond max)', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Distance 400 (beyond max)', false, err.message);
}

// Test 12: Negative distance → gain 0 (invalid input)
try {
  const v = calculateVolume(-50);
  assert.strictEqual(v, 0, 'Expected gain 0 for negative distance');
  recordResult('Volume — Negative distance', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Negative distance', false, err.message);
}

// Test 13: NaN distance → gain 0
try {
  const v = calculateVolume(NaN);
  assert.strictEqual(v, 0, 'Expected gain 0 for NaN distance');
  recordResult('Volume — NaN distance', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — NaN distance', false, err.message);
}

// Test 14: Infinite distance → gain 0
try {
  const v = calculateVolume(Infinity);
  assert.strictEqual(v, 0, 'Expected gain 0 for Infinity distance');
  recordResult('Volume — Infinite distance', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Infinite distance', false, err.message);
}

// Test 15: Invalid maxDistance (0) → gain 0
try {
  const v = calculateVolume(100, 0);
  assert.strictEqual(v, 0, 'Expected gain 0 for maxDistance = 0');
  recordResult('Volume — maxDistance = 0', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — maxDistance = 0', false, err.message);
}

// Test 16: Invalid maxDistance (negative) → gain 0
try {
  const v = calculateVolume(50, -100);
  assert.strictEqual(v, 0, 'Expected gain 0 for negative maxDistance');
  recordResult('Volume — Negative maxDistance', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Negative maxDistance', false, err.message);
}

// Test 17: Invalid maxDistance (NaN) → gain 0
try {
  const v = calculateVolume(50, NaN);
  assert.strictEqual(v, 0, 'Expected gain 0 for NaN maxDistance');
  recordResult('Volume — NaN maxDistance', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — NaN maxDistance', false, err.message);
}

// Test 18: Custom maxDistance — distance 50 with maxDistance 100 → gain 0.50
try {
  const v = calculateVolume(50, 100);
  assert.strictEqual(v, 0.5, 'Expected gain 0.50 with custom max 100');
  recordResult('Volume — Custom maxDistance', true, `gain = ${v}`);
} catch (err) {
  recordResult('Volume — Custom maxDistance', false, err.message);
}

// Test 19: End-to-end — calculateDistance feeds calculateVolume
try {
  const local = { x: 100, y: 100 };
  const remote = { x: 250, y: 100 }; // 150px horizontal
  const d = calculateDistance(local, remote);
  const v = calculateVolume(d);
  assert.strictEqual(d, 150, 'Expected distance 150');
  assert.strictEqual(v, 0.5, 'Expected gain 0.50 at distance 150');
  recordResult('End-to-end — distance→volume', true, `d=${d}, gain=${v}`);
} catch (err) {
  recordResult('End-to-end — distance→volume', false, err.message);
}

// ─────────────────────── Summary ──────────────────────────────────────

console.log('\n================================================================');
const passed = testResults.filter((t) => t.Status === 'PASSED').length;
const failed = testResults.filter((t) => t.Status === 'FAILED').length;
console.log(`  Results: ${passed} passed, ${failed} failed, ${testResults.length} total`);
console.log('================================================================\n');

if (failed > 0) {
  console.table(testResults.filter((t) => t.Status === 'FAILED'));
  process.exit(1);
} else {
  console.log('All spatial audio utility tests passed ✓\n');
}
