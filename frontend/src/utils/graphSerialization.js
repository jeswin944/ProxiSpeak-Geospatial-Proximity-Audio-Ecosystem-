/**
 * Graph Serialization & Deserialization Engine for ProxiSpeak React Flow
 *
 * Ensures:
 * - Versioned, schema-validated JSON export
 * - Complete preservation of Node IDs, types, positions, configuration data
 * - Complete preservation of Edge IDs, source/target nodes, source/target handles
 * - Clean sanitization of transient UI state, DOM references, and functions
 * - Safe deserialization with schema validation and error reporting
 */

const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Sanitizes and extracts plain serializable node data
 */
function sanitizeNode(node) {
  if (!node || typeof node !== 'object') {
    throw new Error('Invalid node: must be a non-null object');
  }

  const { id, type, position = { x: 0, y: 0 }, data = {} } = node;

  if (!id || typeof id !== 'string') {
    throw new Error(`Node is missing required string "id": ${JSON.stringify(node)}`);
  }
  if (!type || typeof type !== 'string') {
    throw new Error(`Node "${id}" is missing required string "type"`);
  }

  // Deep clone data to avoid circular references or functions
  let cleanData = {};
  try {
    cleanData = JSON.parse(JSON.stringify(data));
  } catch (err) {
    throw new Error(`Node "${id}" contains non-serializable configuration data: ${err.message}`);
  }

  return {
    id,
    type,
    position: {
      x: Number(position.x) || 0,
      y: Number(position.y) || 0
    },
    data: cleanData
  };
}

/**
 * Sanitizes and extracts plain serializable edge data
 */
function sanitizeEdge(edge) {
  if (!edge || typeof edge !== 'object') {
    throw new Error('Invalid edge: must be a non-null object');
  }

  const { id, source, target, sourceHandle = null, targetHandle = null } = edge;

  if (!id || typeof id !== 'string') {
    throw new Error(`Edge is missing required string "id": ${JSON.stringify(edge)}`);
  }
  if (!source || typeof source !== 'string') {
    throw new Error(`Edge "${id}" is missing required string "source"`);
  }
  if (!target || typeof target !== 'string') {
    throw new Error(`Edge "${id}" is missing required string "target"`);
  }

  return {
    id,
    source,
    target,
    sourceHandle: sourceHandle ? String(sourceHandle) : null,
    targetHandle: targetHandle ? String(targetHandle) : null
  };
}

/**
 * Serializes nodes, edges, and metadata into a versioned JSON object or string
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @param {object} metadata
 * @param {boolean} asString
 * @returns {object|string}
 */
function serializeGraph(nodes = [], edges = [], metadata = {}, asString = false) {
  if (!Array.isArray(nodes)) throw new Error('Nodes must be an array');
  if (!Array.isArray(edges)) throw new Error('Edges must be an array');

  const cleanNodes = nodes.map(sanitizeNode);
  const cleanEdges = edges.map(sanitizeEdge);

  const payload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: metadata.id || `graph-${Date.now()}`,
    name: metadata.name || 'Untitled Graph',
    description: metadata.description || '',
    updatedAt: new Date().toISOString(),
    nodes: cleanNodes,
    edges: cleanEdges
  };

  return asString ? JSON.stringify(payload, null, 2) : payload;
}

/**
 * Deserializes and validates a JSON string or object back into React Flow compatible nodes and edges
 *
 * @param {string|object} rawInput
 * @returns {object} { nodes, edges, metadata, schemaVersion }
 */
function deserializeGraph(rawInput) {
  let parsed = rawInput;

  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      throw new Error(`Malformed JSON string cannot be deserialized: ${err.message}`);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Deserialization target must be a non-null object or JSON string');
  }

  if (!parsed.schemaVersion) {
    throw new Error('Missing "schemaVersion" in graph payload');
  }

  const majorVersion = String(parsed.schemaVersion).split('.')[0];
  if (majorVersion !== '1') {
    throw new Error(`Unsupported schemaVersion "${parsed.schemaVersion}". Supported version: ^1.x`);
  }

  if (!Array.isArray(parsed.nodes)) {
    throw new Error('Missing or invalid "nodes" array in serialized graph');
  }
  if (!Array.isArray(parsed.edges)) {
    throw new Error('Missing or invalid "edges" array in serialized graph');
  }

  const nodes = parsed.nodes.map(sanitizeNode);
  const edges = parsed.edges.map(sanitizeEdge);

  return {
    schemaVersion: parsed.schemaVersion,
    metadata: {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      updatedAt: parsed.updatedAt
    },
    nodes,
    edges
  };
}

// Support both CommonJS and ES Module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CURRENT_SCHEMA_VERSION,
    serializeGraph,
    deserializeGraph,
    sanitizeNode,
    sanitizeEdge
  };
}
