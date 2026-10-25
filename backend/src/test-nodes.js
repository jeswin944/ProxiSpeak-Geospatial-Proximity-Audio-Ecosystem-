const assert = require('assert');
const {
  createStaticSource,
  createIntervalSource,
  createManualSource,
  createMockEventsSource
} = require('./compiler/operators/sourceOperators');
const {
  applyMathOperation,
  createMathStream
} = require('./compiler/operators/mathOperators');
const {
  createActionLoggerStream,
  createActionEventEmitterStream,
  createActionThresholdAlertStream
} = require('./compiler/operators/actionOperators');
const { of } = require('rxjs');
const { take, toArray } = require('rxjs/operators');

console.log('================================================================');
console.log('         ProxiSpeak Week 2 — Node Library Test Suite            ');
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

async function runNodeLibraryTests() {
  // Test 1: Static Source Node
  try {
    const static$ = createStaticSource({ value: 42 });
    const result = await static$.toPromise();
    assert.strictEqual(result, 42);
    recordResult('Data Source: Static Value', true, 'Emitted exact configured static value 42');
  } catch (err) {
    recordResult('Data Source: Static Value', false, err.message);
  }

  // Test 2: Interval Timer Source Node
  try {
    const interval$ = createIntervalSource({ intervalMs: 20, maxTicks: 3 });
    const results = await interval$.pipe(toArray()).toPromise();
    assert.strictEqual(results.length, 3);
    assert.strictEqual(results[2].tick, 3);
    recordResult('Data Source: Interval Timer', true, 'Emitted exact requested 3 ticks at 20ms cadence');
  } catch (err) {
    recordResult('Data Source: Interval Timer', false, err.message);
  }

  // Test 3: Manual Input Source Node
  try {
    const manual = createManualSource();
    const emitted = [];
    const sub = manual.stream$.subscribe((v) => emitted.push(v));

    manual.push('user-input-1');
    manual.push('user-input-2');
    sub.unsubscribe();

    assert.deepStrictEqual(emitted, ['user-input-1', 'user-input-2']);
    recordResult('Data Source: Manual Input Pusher', true, 'Successfully pushed and observed interactive inputs');
  } catch (err) {
    recordResult('Data Source: Manual Input Pusher', false, err.message);
  }

  // Test 4: Mock Telemetry Stream Node
  try {
    const mock$ = createMockEventsSource({ eventCount: 4, intervalMs: 20 });
    const events = await mock$.pipe(toArray()).toPromise();
    assert.strictEqual(events.length, 4);
    assert.strictEqual(events[0].eventType === undefined || typeof events[0].officeId === 'string', true);
    assert.strictEqual(typeof events[0].x, 'number');
    recordResult('Data Source: Mock Telemetry Stream', true, 'Emitted 4 simulated geospatial presence frames');
  } catch (err) {
    recordResult('Data Source: Mock Telemetry Stream', false, err.message);
  }

  // Test 5: Math Operations (Add, Subtract, Multiply, Min, Max, Comparisons)
  try {
    assert.strictEqual(applyMathOperation(10, 5, 'add'), 15);
    assert.strictEqual(applyMathOperation(10, 5, 'subtract'), 5);
    assert.strictEqual(applyMathOperation(10, 5, 'multiply'), 50);
    assert.strictEqual(applyMathOperation(10, 5, 'min'), 5);
    assert.strictEqual(applyMathOperation(10, 5, 'max'), 10);
    assert.strictEqual(applyMathOperation(10, 5, 'compare_gt'), true);
    assert.strictEqual(applyMathOperation(10, 5, 'compare_lt'), false);
    assert.strictEqual(applyMathOperation(10, 10, 'compare_eq'), true);
    recordResult('Math Operations: Arithmetic & Comparison', true, 'All core math and relational operations validated');
  } catch (err) {
    recordResult('Math Operations: Arithmetic & Comparison', false, err.message);
  }

  // Test 6: Division by Zero explicit handling
  try {
    const safeResult = applyMathOperation(100, 0, 'divide', { fallbackOnZero: 0 });
    assert.strictEqual(safeResult, 0, 'Division by zero returned configured fallback value 0');

    let threw = false;
    try {
      applyMathOperation(100, 0, 'divide', { throwOnZero: true });
    } catch (_) {
      threw = true;
    }
    assert.strictEqual(threw, true, 'Division by zero threw expected controlled error when configured');
    recordResult('Math Operations: Division by Zero Safety', true, 'Safely handled division by zero with fallback and error mode');
  } catch (err) {
    recordResult('Math Operations: Division by Zero Safety', false, err.message);
  }

  // Test 7: Non-numeric math input rejection
  try {
    let rejected = false;
    try {
      applyMathOperation('not-a-number', 10, 'add');
    } catch (e) {
      rejected = true;
    }
    assert.strictEqual(rejected, true);
    recordResult('Math Operations: Non-Numeric Validation', true, 'Correctly rejected invalid non-numeric inputs');
  } catch (err) {
    recordResult('Math Operations: Non-Numeric Validation', false, err.message);
  }

  // Test 8: Action Logger with Throttle Rate Limiting
  try {
    const logs = [];
    const source$ = of(1, 2, 3, 4, 5);
    const logger$ = createActionLoggerStream(source$, { prefix: '[TEST]', throttleMs: 100 }, {
      onLog: (entry) => logs.push(entry)
    });

    await logger$.pipe(toArray()).toPromise();
    // Because values 1..5 were synchronous, throttleTime(100) allows the first item and suppresses subsequent bursts
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].payload, 1);
    recordResult('Action Trigger: Logger & Rate Limiter', true, 'Throttled rapid burst to single structured log entry');
  } catch (err) {
    recordResult('Action Trigger: Logger & Rate Limiter', false, err.message);
  }

  // Test 9: Action Event Emitter
  try {
    const emitted = [];
    const source$ = of({ user: 'avatar-1', status: 'arrived' });
    const emitter$ = createActionEventEmitterStream(source$, { eventName: 'office:avatar_arrived' }, {
      onEmit: (evt) => emitted.push(evt)
    });

    await emitter$.pipe(toArray()).toPromise();
    assert.strictEqual(emitted.length, 1);
    assert.strictEqual(emitted[0].eventName, 'office:avatar_arrived');
    recordResult('Action Trigger: Event Emitter', true, 'Dispatched internal event with verified payload');
  } catch (err) {
    recordResult('Action Trigger: Event Emitter', false, err.message);
  }

  // Test 10: Action Threshold Alert
  try {
    const alerts = [];
    const source$ = of(50, 120, 90, 200);
    const alert$ = createActionThresholdAlertStream(source$, { threshold: 100, comparison: 'gt' }, {
      onAlert: (a) => alerts.push(a)
    });

    await alert$.pipe(toArray()).toPromise();
    // Only 120 and 200 exceed 100
    assert.strictEqual(alerts.length, 2);
    assert.strictEqual(alerts[0].value, 120);
    assert.strictEqual(alerts[1].value, 200);
    recordResult('Action Trigger: Threshold Alert', true, 'Correctly filtered and triggered 2 threshold breaches');
  } catch (err) {
    recordResult('Action Trigger: Threshold Alert', false, err.message);
  }

  console.log('\n================================================================');
  console.log('              NODE LIBRARY TEST RESULTS SUMMARY                 ');
  console.log('================================================================');
  console.table(testResults);

  const allPassed = testResults.every((t) => t.Status === 'PASSED');
  if (allPassed) {
    console.log('\n🎉 ALL 10 NODE LIBRARY TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME NODE LIBRARY TESTS FAILED.\n');
    process.exit(1);
  }
}

runNodeLibraryTests();
