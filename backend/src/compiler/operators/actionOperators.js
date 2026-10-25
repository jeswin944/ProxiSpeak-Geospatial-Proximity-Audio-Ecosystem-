const { of } = require('rxjs');
const { map, tap, throttleTime, catchError } = require('rxjs/operators');

/**
 * Creates an action logger stream with optional rate limiting and custom sink
 */
function createActionLoggerStream(inputStream$, config = {}, context = {}) {
  const prefix = config.prefix || '[GRAPH-LOG]';
  const throttleMs = Math.max(0, Number(config.throttleMs) || 0);

  let stream$ = inputStream$;
  if (throttleMs > 0) {
    stream$ = stream$.pipe(throttleTime(throttleMs));
  }

  return stream$.pipe(
    map((payload) => {
      const entry = {
        action: 'log',
        prefix,
        payload,
        timestamp: Date.now()
      };
      if (context.onLog && typeof context.onLog === 'function') {
        context.onLog(entry);
      }
      return entry;
    })
  );
}

/**
 * Creates an event emitter stream that dispatches validated internal events
 */
function createActionEventEmitterStream(inputStream$, config = {}, context = {}) {
  const eventName = config.eventName || 'graph:event';

  return inputStream$.pipe(
    map((payload) => {
      const event = {
        action: 'emit',
        eventName,
        payload,
        timestamp: Date.now()
      };
      if (context.onEmit && typeof context.onEmit === 'function') {
        context.onEmit(event);
      }
      return event;
    })
  );
}

/**
 * Creates a threshold alert stream that emits alerts when input exceeds threshold
 */
function createActionThresholdAlertStream(inputStream$, config = {}, context = {}) {
  const threshold = Number(config.threshold) || 100;
  const comparison = config.comparison || 'gt';

  return inputStream$.pipe(
    map((payload) => {
      const rawVal = typeof payload === 'object' && payload !== null && payload.result !== undefined ? payload.result : payload;
      const numericVal = Number(rawVal);
      const isBreached = comparison === 'gt' ? numericVal > threshold : numericVal < threshold;

      const alert = {
        action: 'alert',
        threshold,
        value: numericVal,
        breached: isBreached,
        timestamp: Date.now()
      };

      if (isBreached && context.onAlert && typeof context.onAlert === 'function') {
        context.onAlert(alert);
      }

      return alert;
    })
  );
}

module.exports = {
  createActionLoggerStream,
  createActionEventEmitterStream,
  createActionThresholdAlertStream
};
