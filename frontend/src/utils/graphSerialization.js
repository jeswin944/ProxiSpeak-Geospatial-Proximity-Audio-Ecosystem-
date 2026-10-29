export const CURRENT_SCHEMA_VERSION = "1.0.0";

/**
 * Sanitizes and validates a React Flow node.
 */
export function sanitizeNode(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    throw new Error("Invalid node: must be a non-null object");
  }

  const { id, type, position = { x: 0, y: 0 }, data = {} } = node;

  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Node must have a valid string id");
  }

  if (typeof type !== "string" || !type.trim()) {
    throw new Error(`Node "${id}" must have a valid string type`);
  }

  if (
    !position ||
    typeof position !== "object" ||
    !Number.isFinite(Number(position.x)) ||
    !Number.isFinite(Number(position.y))
  ) {
    throw new Error(`Node "${id}" has an invalid position`);
  }

  let cleanData;

  try {
    cleanData = JSON.parse(JSON.stringify(data));
  } catch (error) {
    throw new Error(
      `Node "${id}" contains non-serializable data: ${error.message}`
    );
  }

  return {
    id,
    type,
    position: {
      x: Number(position.x),
      y: Number(position.y)
    },
    data: cleanData
  };
}

/**
 * Sanitizes and validates a React Flow edge.
 */
export function sanitizeEdge(edge) {
  if (!edge || typeof edge !== "object" || Array.isArray(edge)) {
    throw new Error("Invalid edge: must be a non-null object");
  }

  const {
    id,
    source,
    target,
    sourceHandle = null,
    targetHandle = null
  } = edge;

  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Edge must have a valid string id");
  }

  if (typeof source !== "string" || !source.trim()) {
    throw new Error(`Edge "${id}" must have a valid source`);
  }

  if (typeof target !== "string" || !target.trim()) {
    throw new Error(`Edge "${id}" must have a valid target`);
  }

  return {
    id,
    source,
    target,
    sourceHandle:
      sourceHandle == null ? null : String(sourceHandle),
    targetHandle:
      targetHandle == null ? null : String(targetHandle),
    ...(edge.type ? { type: edge.type } : {}),
    ...(edge.label !== undefined ? { label: edge.label } : {}),
    ...(edge.animated !== undefined ? { animated: edge.animated } : {}),
    ...(edge.data !== undefined ? { data: edge.data } : {})
  };
}

/**
 * Serializes nodes and edges into a versioned JSON payload.
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Object} metadata
 * @param {boolean} asString
 * @returns {Object|string}
 */
export function serializeGraph(
  nodes = [],
  edges = [],
  metadata = {},
  asString = false
) {
  if (!Array.isArray(nodes)) {
    throw new Error("Nodes must be an array");
  }

  if (!Array.isArray(edges)) {
    throw new Error("Edges must be an array");
  }

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("Metadata must be an object");
  }

  const cleanNodes = nodes.map(sanitizeNode);
  const cleanEdges = edges.map(sanitizeEdge);

  const payload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: metadata.id || `graph-${Date.now()}`,
    name: metadata.name || "Untitled Graph",
    description: metadata.description || "",
    updatedAt: new Date().toISOString(),
    nodes: cleanNodes,
    edges: cleanEdges
  };

  return asString ? JSON.stringify(payload, null, 2) : payload;
}

/**
 * Deserializes and validates a graph JSON string or object.
 *
 * @param {string|Object} rawInput
 * @returns {Object}
 */
export function deserializeGraph(rawInput) {
  let parsed = rawInput;

  if (typeof rawInput === "string") {
    try {
      parsed = JSON.parse(rawInput);
    } catch (error) {
      throw new Error(
        `Malformed JSON string: ${error.message}`
      );
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "Deserialization target must be an object or JSON string"
    );
  }

  if (!parsed.schemaVersion) {
    throw new Error('Missing "schemaVersion" in graph payload');
  }

  const majorVersion = String(parsed.schemaVersion).split(".")[0];

  if (majorVersion !== "1") {
    throw new Error(
      `Unsupported schemaVersion "${parsed.schemaVersion}". Supported version: ^1.x`
    );
  }

  if (!Array.isArray(parsed.nodes)) {
    throw new Error('Missing or invalid "nodes" array');
  }

  if (!Array.isArray(parsed.edges)) {
    throw new Error('Missing or invalid "edges" array');
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
export {
  CURRENT_SCHEMA_VERSION,
  serializeGraph,
  deserializeGraph,
  sanitizeNode,
  sanitizeEdge
};
