const { combineLatest, of, isObservable } = require('rxjs');
const { map } = require('rxjs/operators');

/**
 * Extracts a numeric value from primitives or structured event objects
 */
function extractNumeric(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return val;
  if (typeof val === 'object') {
    if (val.result !== undefined) return extractNumeric(val.result);
    if (val.value !== undefined) return extractNumeric(val.value);
    if (val.tick !== undefined) return extractNumeric(val.tick);
  }
  return Number(val);
}

/**
 * Executes a safe mathematical or comparison operation on two values
 */
function applyMathOperation(valA, valB, operation, config = {}) {
  const numA = extractNumeric(valA);
  const numB = extractNumeric(valB);

  if (isNaN(numA) || isNaN(numB)) {
    throw new Error(`Math operation "${operation}" received non-numeric inputs: A=${JSON.stringify(valA)}, B=${JSON.stringify(valB)}`);
  }

  const fallbackOnZero = config.fallbackOnZero !== undefined ? config.fallbackOnZero : null;

  switch (operation) {
    case 'add':
      return numA + numB;
    case 'subtract':
      return numA - numB;
    case 'multiply':
      return numA * numB;
    case 'divide':
      if (numB === 0) {
        if (config.throwOnZero) {
          throw new Error('Division by zero encountered in graph execution.');
        }
        return fallbackOnZero;
      }
      return numA / numB;
    case 'min':
      return Math.min(numA, numB);
    case 'max':
      return Math.max(numA, numB);
    case 'modulo':
      if (numB === 0) return fallbackOnZero;
      return numA % numB;
    case 'compare_gt':
      return numA > numB;
    case 'compare_lt':
      return numA < numB;
    case 'compare_eq':
      return numA === numB;
    default:
      throw new Error(`Unsupported math operation: "${operation}"`);
  }
}

/**
 * Combines two input streams (or fallback constants) into an executable math transformation
 */
function createMathStream(streamA$, streamB$, config = {}) {
  const operation = config.operation || 'add';
  const obsA$ = streamA$ || of(config.defaultA !== undefined ? config.defaultA : 0);
  const obsB$ = streamB$ || of(config.defaultB !== undefined ? config.defaultB : 0);

  return combineLatest([obsA$, obsB$]).pipe(
    map(([valA, valB]) => {
      const result = applyMathOperation(valA, valB, operation, config);
      return {
        result,
        operation,
        inputs: { a: valA, b: valB },
        timestamp: Date.now()
      };
    })
  );
}

module.exports = {
  applyMathOperation,
  createMathStream
};
