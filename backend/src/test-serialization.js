const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  serializeGraph,
  deserializeGraph
} = require('../../frontend/src/utils/graphSerialization');
const { compileGraph } = require('./compiler/graphCompiler');

console.log('================================================================');
console.log('     ProxiSpeak Mid-Project Review — Serialization Test Suite   ');
console.log('================================================================\n');

const testResults = [];

function recordResult(name, passed, details) {
  testResults.push({
    Test: name,
    Status: passed ? 'PASSED' : 'FAILED',
    Details: details
  });
  console.log(`${passed ? '✓ PASS' : '✗ FAIL'}: ${name} — ${details}`);
}

async function runSerializationTests() {
  // Load complex test fixture
  const fixturePath = path.join(__dirname, 'fixtures', 'complex-branching-graph.json');
  const fixtureRaw = fs.readFileSync(fixturePath, 'utf8');
  const sourceGraph = JSON.parse(fixtureRaw);

  // Test 1: Serialize to valid JSON string
  try {
    const jsonString = serializeGraph(sourceGraph.nodes, sourceGraph.edges, {
      id: sourceGraph.id,
      name: sourceGraph.name,
      description: sourceGraph.description
    }, true);

    assert.strictEqual(typeof jsonString, 'string');
    const parsed = JSON.parse(jsonString);
    assert.strictEqual(parsed.schemaVersion, '1.0.0');
    assert.strictEqual(parsed.nodes.length, sourceGraph.nodes.length);
    assert.strictEqual(parsed.edges.length, sourceGraph.edges.length);
    recordResult('Graph Serialization to JSON', true, 'Produced valid schemaVersion 1.0.0 JSON string');
  } catch (err) {
    recordResult('Graph Serialization to JSON', false, err.message);
  }

  // Test 2: Full Round-Trip Equivalence (serialize -> deserialize -> compare)
  try {
    const serialized = serializeGraph(sourceGraph.nodes, sourceGraph.edges, { id: 'roundtrip-1' });
    const deserialized = deserializeGraph(serialized);

    assert.strictEqual(deserialized.nodes.length, sourceGraph.nodes.length, 'Node count must match');
    assert.strictEqual(deserialized.edges.length, sourceGraph.edges.length, 'Edge count must match');

    // Check each node identity and attributes
    for (let i = 0; i < sourceGraph.nodes.length; i++) {
      const srcNode = sourceGraph.nodes[i];
      const destNode = deserialized.nodes.find((n) => n.id === srcNode.id);
      assert.ok(destNode, `Node "${srcNode.id}" must exist in deserialized graph`);
      assert.strictEqual(destNode.type, srcNode.type, 'Node type must match');
      assert.strictEqual(destNode.position.x, srcNode.position.x, 'Position X must match');
      assert.strictEqual(destNode.position.y, srcNode.position.y, 'Position Y must match');
      assert.deepStrictEqual(destNode.data, srcNode.data, 'Node configuration data must match exactly');
    }

    // Check edge preservation
    for (let i = 0; i < sourceGraph.edges.length; i++) {
      const srcEdge = sourceGraph.edges[i];
      const destEdge = deserialized.edges.find((e) => e.id === srcEdge.id);
      assert.ok(destEdge, `Edge "${srcEdge.id}" must exist in deserialized graph`);
      assert.strictEqual(destEdge.source, srcEdge.source, 'Edge source must match');
      assert.strictEqual(destEdge.target, srcEdge.target, 'Edge target must match');
      assert.strictEqual(destEdge.sourceHandle, srcEdge.sourceHandle, 'Source handle must match');
      assert.strictEqual(destEdge.targetHandle, srcEdge.targetHandle, 'Target handle must match');
    }

    recordResult('Round-Trip Structural & Data Equivalence', true, 'Identical nodes, edges, positions, and handles reconstructed');
  } catch (err) {
    recordResult('Round-Trip Structural & Data Equivalence', false, err.message);
  }

  // Test 3: Source Immobility & Non-Mutation
  try {
    const originalSnapshot = JSON.stringify(sourceGraph);
    serializeGraph(sourceGraph.nodes, sourceGraph.edges, { id: 'immutability-check' });
    const postSnapshot = JSON.stringify(sourceGraph);
    assert.strictEqual(originalSnapshot, postSnapshot, 'Serialization must never mutate the in-memory graph objects');
    recordResult('Source Graph Immutability', true, 'Verified zero mutation of source graph data structures during serialization');
  } catch (err) {
    recordResult('Source Graph Immutability', false, err.message);
  }

  // Test 4: Compilation of Deserialized Graph (Compile restored graph into RxJS pipeline)
  try {
    const serialized = serializeGraph(sourceGraph.nodes, sourceGraph.edges, { id: 'compile-test' });
    const restored = deserializeGraph(serialized);
    const compilation = compileGraph(restored);

    assert.strictEqual(compilation.success, true, 'Restored graph must successfully compile');
    assert.strictEqual(compilation.nodeCount, 7);
    assert.strictEqual(compilation.edgeCount, 6);

    // Execute the compiled pipeline:
    // Base speed (15) + Delta (5) = Sum (20)
    // Scale: 20 * 2 = 40
    // Alert: 40 > 30 => BREACHED!
    const runResult = await compilation.pipeline.runUntilTimeout(150);
    assert.strictEqual(runResult.logs.length >= 1, true);
    assert.strictEqual(runResult.logs[0].payload.result, 40, 'Final math calculation should be (15+5)*2 = 40');
    assert.strictEqual(runResult.triggeredAlerts.length >= 1, true, 'Alert should trigger because 40 > 30');
    assert.strictEqual(runResult.triggeredAlerts[0].breached, true);
    recordResult('Execution of Restored Complex Graph', true, 'Compiled and executed deserialized branching pipeline: (15+5)*2=40, alert triggered');
  } catch (err) {
    recordResult('Execution of Restored Complex Graph', false, err.message);
  }

  // Test 5: Rejection of Malformed JSON and Unsupported Schema Versions
  try {
    let malformedCaught = false;
    try {
      deserializeGraph('{"invalid_json": true');
    } catch (_) {
      malformedCaught = true;
    }
    assert.strictEqual(malformedCaught, true, 'Malformed JSON must throw error');

    let unsupportedVersionCaught = false;
    try {
      deserializeGraph({ schemaVersion: '99.0.0', nodes: [], edges: [] });
    } catch (e) {
      if (e.message.includes('Unsupported schemaVersion')) unsupportedVersionCaught = true;
    }
    assert.strictEqual(unsupportedVersionCaught, true, 'Unsupported major schema version must throw error');

    recordResult('Malformed JSON & Unsupported Version Rejection', true, 'Correctly rejected malformed JSON and version mismatch');
  } catch (err) {
    recordResult('Malformed JSON & Unsupported Version Rejection', false, err.message);
  }

  console.log('\n================================================================');
  console.log('             SERIALIZATION TEST RESULTS SUMMARY                 ');
  console.log('================================================================');
  console.table(testResults);

  const allPassed = testResults.every((t) => t.Status === 'PASSED');
  if (allPassed) {
    console.log('\n🎉 ALL 5 GRAPH SERIALIZATION TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME SERIALIZATION TESTS FAILED.\n');
    process.exit(1);
  }
}

runSerializationTests();
