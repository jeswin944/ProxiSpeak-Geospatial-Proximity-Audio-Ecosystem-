/**
 * Node Registry for ProxiSpeak Logic Compiler
 * Defines supported node types, port signatures, categories, and configuration validators.
 */

const NODE_CATEGORIES = {
  DATA_SOURCE: 'DATA_SOURCE',
  MATH_OPERATION: 'MATH_OPERATION',
  ACTION_TRIGGER: 'ACTION_TRIGGER'
};

const MATH_OPERATIONS = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'min',
  'max',
  'modulo',
  'compare_gt',
  'compare_lt',
  'compare_eq'
];

const NODE_DEFINITIONS = {
  // ── Data Sources ──────────────────────────────────────────
  source_static: {
    type: 'source_static',
    category: NODE_CATEGORIES.DATA_SOURCE,
    label: 'Static Value Source',
    description: 'Emits a static numeric, string, or boolean value.',
    inputs: [],
    outputs: ['out'],
    defaultConfig: { value: 10 },
    validateConfig: (data) => {
      if (data === undefined || data === null || data.value === undefined) {
        return { valid: false, error: 'Static source requires a "value" in configuration.' };
      }
      return { valid: true };
    }
  },

  source_interval: {
    type: 'source_interval',
    category: NODE_CATEGORIES.DATA_SOURCE,
    label: 'Interval Timer Source',
    description: 'Emits periodic ticks or timestamps at a defined interval (ms).',
    inputs: [],
    outputs: ['out'],
    defaultConfig: { intervalMs: 1000, maxTicks: 10 },
    validateConfig: (data) => {
      const intervalMs = Number(data?.intervalMs);
      if (isNaN(intervalMs) || intervalMs < 20) {
        return { valid: false, error: 'Interval must be a number >= 20ms to prevent flooding.' };
      }
      if (data?.maxTicks !== undefined && (isNaN(Number(data.maxTicks)) || Number(data.maxTicks) < 1)) {
        return { valid: false, error: 'maxTicks must be an integer >= 1 if provided.' };
      }
      return { valid: true };
    }
  },

  source_manual: {
    type: 'source_manual',
    category: NODE_CATEGORIES.DATA_SOURCE,
    label: 'Manual Input Source',
    description: 'Receives external push data or user input streams.',
    inputs: [],
    outputs: ['out'],
    defaultConfig: { initialValue: null },
    validateConfig: () => ({ valid: true })
  },

  source_mock_events: {
    type: 'source_mock_events',
    category: NODE_CATEGORIES.DATA_SOURCE,
    label: 'Telemetry Mock Stream',
    description: 'Emits a controlled mock telemetry stream for proximity testing.',
    inputs: [],
    outputs: ['out'],
    defaultConfig: { eventCount: 5, intervalMs: 100 },
    validateConfig: (data) => {
      const count = Number(data?.eventCount || 5);
      if (isNaN(count) || count < 1 || count > 1000) {
        return { valid: false, error: 'eventCount must be between 1 and 1000.' };
      }
      return { valid: true };
    }
  },

  // ── Math Operations ───────────────────────────────────────
  math_operation: {
    type: 'math_operation',
    category: NODE_CATEGORIES.MATH_OPERATION,
    label: 'Math Operation',
    description: 'Applies safe mathematical or comparison transformations to inputs A and B.',
    inputs: ['a', 'b'],
    outputs: ['out'],
    defaultConfig: { operation: 'add', fallbackOnZero: 0 },
    validateConfig: (data) => {
      if (!data?.operation || !MATH_OPERATIONS.includes(data.operation)) {
        return {
          valid: false,
          error: `Operation must be one of: ${MATH_OPERATIONS.join(', ')}.`
        };
      }
      return { valid: true };
    }
  },

  // ── Action Triggers ───────────────────────────────────────
  action_logger: {
    type: 'action_logger',
    category: NODE_CATEGORIES.ACTION_TRIGGER,
    label: 'Log Action Trigger',
    description: 'Outputs formatted debug/audit log entries with rate-limiting.',
    inputs: ['in'],
    outputs: ['logged'],
    defaultConfig: { prefix: '[GRAPH-LOG]', throttleMs: 50 },
    validateConfig: (data) => {
      if (data?.throttleMs !== undefined && (isNaN(Number(data.throttleMs)) || Number(data.throttleMs) < 0)) {
        return { valid: false, error: 'throttleMs must be a non-negative number.' };
      }
      return { valid: true };
    }
  },

  action_event_emitter: {
    type: 'action_event_emitter',
    category: NODE_CATEGORIES.ACTION_TRIGGER,
    label: 'Event Emitter Trigger',
    description: 'Dispatches internal application events to registered subscribers.',
    inputs: ['in'],
    outputs: ['emitted'],
    defaultConfig: { eventName: 'graph:event' },
    validateConfig: (data) => {
      if (!data?.eventName || typeof data.eventName !== 'string' || data.eventName.trim().length === 0) {
        return { valid: false, error: 'action_event_emitter requires a non-empty "eventName".' };
      }
      return { valid: true };
    }
  },

  action_threshold_alert: {
    type: 'action_threshold_alert',
    category: NODE_CATEGORIES.ACTION_TRIGGER,
    label: 'Threshold Alert Trigger',
    description: 'Emits an alert payload when an input value exceeds a threshold.',
    inputs: ['in'],
    outputs: ['alert'],
    defaultConfig: { threshold: 100, comparison: 'gt' },
    validateConfig: (data) => {
      if (data?.threshold === undefined || isNaN(Number(data.threshold))) {
        return { valid: false, error: 'threshold must be a valid number.' };
      }
      return { valid: true };
    }
  }
};

/**
 * Check if a node type is registered
 */
function isNodeTypeSupported(type) {
  return Boolean(NODE_DEFINITIONS[type]);
}

/**
 * Retrieve metadata for a node type
 */
function getNodeDefinition(type) {
  return NODE_DEFINITIONS[type] || null;
}

/**
 * List all supported node types
 */
function listSupportedNodeTypes() {
  return Object.values(NODE_DEFINITIONS).map((def) => ({
    type: def.type,
    category: def.category,
    label: def.label,
    description: def.description,
    inputs: [...def.inputs],
    outputs: [...def.outputs],
    defaultConfig: { ...def.defaultConfig }
  }));
}

module.exports = {
  NODE_CATEGORIES,
  MATH_OPERATIONS,
  NODE_DEFINITIONS,
  isNodeTypeSupported,
  getNodeDefinition,
  listSupportedNodeTypes
};
