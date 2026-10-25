const { of, interval, from, Subject } = require('rxjs');
const { map, take, throttleTime } = require('rxjs/operators');

/**
 * Creates an Observable for a static value source node
 */
function createStaticSource(config = {}) {
  const value = config.value !== undefined ? config.value : 0;
  return of(value);
}

/**
 * Creates an Observable for a periodic interval timer source node
 */
function createIntervalSource(config = {}) {
  const intervalMs = Math.max(20, Number(config.intervalMs) || 1000);
  const maxTicks = config.maxTicks !== undefined ? Math.max(1, Number(config.maxTicks)) : null;

  let stream$ = interval(intervalMs).pipe(
    map((tick) => ({
      tick: tick + 1,
      timestamp: Date.now(),
      value: tick + 1
    }))
  );

  if (maxTicks !== null && !isNaN(maxTicks)) {
    stream$ = stream$.pipe(take(maxTicks));
  }

  return stream$;
}

/**
 * Creates a manual input source (Subject) that can receive external pushes
 */
function createManualSource(config = {}) {
  const subject$ = new Subject();
  return {
    stream$: subject$.asObservable(),
    push: (value) => subject$.next(value),
    complete: () => subject$.complete(),
    error: (err) => subject$.error(err)
  };
}

/**
 * Creates a mock telemetry stream for proximity and motion testing
 */
function createMockEventsSource(config = {}) {
  const count = Math.min(1000, Math.max(1, Number(config.eventCount) || 5));
  const intervalMs = Math.max(20, Number(config.intervalMs) || 100);

  return interval(intervalMs).pipe(
    take(count),
    map((i) => ({
      eventId: `mock-evt-${i + 1}`,
      timestamp: new Date().toISOString(),
      userId: `user-sim-${(i % 3) + 1}`,
      officeId: config.officeId || 'main-office',
      x: 100 + (i * 25) % 600,
      y: 100 + (i * 15) % 400,
      speed: 1.5 + (i % 3) * 0.5,
      signalStrength: -40 - (i * 2) % 30
    }))
  );
}

module.exports = {
  createStaticSource,
  createIntervalSource,
  createManualSource,
  createMockEventsSource
};
