const assert = require('assert');
const { validateGraph } = require('./compiler/graphValidator');
const { compileGraph } = require('./compiler/graphCompiler');
const graphExecutionService = require('./services/graphExecutionService');

console.log('================================================================');
console.log('       ProxiSpeak Week 2 — Logic Compiler Test Suite            ');
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

async function runCompilerTests() {
  // Test 1: Valid linear pipeline compilation and execution
  try {
    const validGraph = {
      id: 'test-graph-linear',
      nodes: [
        {
          id: 'src-1',
          type: 'source_static',
          data: { value: 25 }
        },
        {
          id: 'math-1',
          type: 'math_operation',
          data: { operation: 'multiply', defaultB: 4 }
        },
        {
          id: 'act-1',
          type: 'action_logger',
          data: { prefix: '[TEST]' }
        }
      ],
      edges: [
        { id: 'e1', source: 'src-1', target: 'math-1', targetHandle: 'a' },
        { id: 'e2', source: 'math-1', target: 'act-1', targetHandle: 'in' }
      ]
    };

    const compilation = compileGraph(validGraph);
    assert.strictEqual(compilation.success, true, 'Compilation should succeed');
    assert.strictEqual(compilation.nodeCount, 3);
    assert.strictEqual(compilation.edgeCount, 2);
    assert.deepStrictEqual(compilation.executionOrder, ['src-1', 'math-1', 'act-1']);

    // Run execution
    const runResult = await compilation.pipeline.runUntilTimeout(150);
    assert.strictEqual(runResult.logs.length >= 1, true, 'Logger action should have logged payload');
    assert.strictEqual(runResult.logs[0].payload.result, 100, '25 * 4 should equal 100');

    recordResult('Valid DAG Pipeline Compilation & Execution', true, 'Compiled 3 nodes in topological order and computed 25*4=100');
  } catch (err) {
    recordResult('Valid DAG Pipeline Compilation & Execution', false, err.message);
  }

  // Test 2: Unknown node type rejection
  try {
    const unknownTypeGraph = {
      nodes: [
        { id: 'node-x', type: 'unsupported_quantum_flux_node', data: {} }
      ],
      edges: []
    };
    const report = validateGraph(unknownTypeGraph);
    assert.strictEqual(report.isValid, false);
    assert.strictEqual(report.errors.some((e) => e.includes('Unsupported node type')), true);
    recordResult('Unknown Node Type Rejection', true, 'Correctly flagged unsupported node type');
  } catch (err) {
    recordResult('Unknown Node Type Rejection', false, err.message);
  }

  // Test 3: Invalid node configuration
  try {
    const invalidConfigGraph = {
      nodes: [
        { id: 'math-bad', type: 'math_operation', data: { operation: 'invalid_sqrt_op' } }
      ],
      edges: []
    };
    const report = validateGraph(invalidConfigGraph);
    assert.strictEqual(report.isValid, false);
    assert.strictEqual(report.errors.some((e) => e.includes('Operation must be one of')), true);
    recordResult('Invalid Node Configuration Detection', true, 'Detected invalid math operation config');
  } catch (err) {
    recordResult('Invalid Node Configuration Detection', false, err.message);
  }

  // Test 4: Missing edge reference detection
  try {
    const brokenEdgeGraph = {
      nodes: [
        { id: 'node-1', type: 'source_static', data: { value: 10 } }
      ],
      edges: [
        { id: 'e-broken', source: 'node-1', target: 'ghost-node-404' }
      ]
    };
    const report = validateGraph(brokenEdgeGraph);
    assert.strictEqual(report.isValid, false);
    assert.strictEqual(report.errors.some((e) => e.includes('non-existent target node')), true);
    recordResult('Missing Edge Reference Detection', true, 'Correctly rejected edge referencing missing target');
  } catch (err) {
    recordResult('Missing Edge Reference Detection', false, err.message);
  }

  // Test 5: Cycle detection (A -> B -> C -> A)
  try {
    const cyclicGraph = {
      nodes: [
        { id: 'A', type: 'math_operation', data: { operation: 'add' } },
        { id: 'B', type: 'math_operation', data: { operation: 'add' } },
        { id: 'C', type: 'math_operation', data: { operation: 'add' } }
      ],
      edges: [
        { id: 'e-ab', source: 'A', target: 'B' },
        { id: 'e-bc', source: 'B', target: 'C' },
        { id: 'e-ca', source: 'C', target: 'A' }
      ]
    };
    const report = validateGraph(cyclicGraph);
    assert.strictEqual(report.isValid, false);
    assert.strictEqual(report.errors.some((e) => e.includes('Cycle detected')), true);
    recordResult('Cycle Detection & DAG Enforcement', true, 'Correctly detected circular dependency loop [A, B, C]');
  } catch (err) {
    recordResult('Cycle Detection & DAG Enforcement', false, err.message);
  }

  // Test 6: Multiple independent executions
  try {
    const graphA = {
      id: 'graph-A',
      nodes: [
        { id: 'src-a', type: 'source_static', data: { value: 111 } },
        { id: 'act-a', type: 'action_logger', data: { prefix: '[A]' } }
      ],
      edges: [{ id: 'e-a', source: 'src-a', target: 'act-a' }]
    };

    const graphB = {
      id: 'graph-B',
      nodes: [
        { id: 'src-b', type: 'source_static', data: { value: 222 } },
        { id: 'act-b', type: 'action_logger', data: { prefix: '[B]' } }
      ],
      edges: [{ id: 'e-b', source: 'src-b', target: 'act-b' }]
    };

    const runA = await graphExecutionService.execute(graphA, { durationMs: 100 });
    const runB = await graphExecutionService.execute(graphB, { durationMs: 100 });

    assert.strictEqual(runA.logs[0].payload, 111);
    assert.strictEqual(runB.logs[0].payload, 222);
    assert.notStrictEqual(runA.executionId, runB.executionId);
    recordResult('Multiple Independent Graph Executions', true, 'Executed parallel pipelines without state crossover');
  } catch (err) {
    recordResult('Multiple Independent Graph Executions', false, err.message);
  }

  // Test 7: Stream cancellation and resource cleanup
  try {
    const longRunningGraph = {
      nodes: [
        { id: 'src-inf', type: 'source_interval', data: { intervalMs: 30 } },
        { id: 'act-inf', type: 'action_logger', data: { prefix: '[INF]' } }
      ],
      edges: [{ id: 'e-inf', source: 'src-inf', target: 'act-inf' }]
    };

    const compilation = compileGraph(longRunningGraph);
    let tickCount = 0;
    compilation.pipeline.start({
      onNext: () => tickCount++
    });

    await new Promise((r) => setTimeout(r, 100));
    const capturedTicks = tickCount;
    assert.strictEqual(capturedTicks > 0, true, 'Stream emitted ticks');

    compilation.pipeline.stop();
    assert.strictEqual(compilation.pipeline.getStatus().isRunning, false);

    await new Promise((r) => setTimeout(r, 100));
    assert.strictEqual(tickCount, capturedTicks, 'Stream cleanly stopped with zero post-teardown events');
    recordResult('Stream Teardown & Leak Prevention', true, 'Cleanly unsubscribed without continuing interval ticks');
  } catch (err) {
    recordResult('Stream Teardown & Leak Prevention', false, err.message);
  }

  console.log('\n================================================================');
  console.log('              COMPILER TEST RESULTS SUMMARY                     ');
  console.log('================================================================');
  console.table(testResults);

  const allPassed = testResults.every((t) => t.Status === 'PASSED');
  if (allPassed) {
    console.log('\n🎉 ALL 7 LOGIC COMPILER TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME COMPILER TESTS FAILED.\n');
    process.exit(1);
  }
}

runCompilerTests();
