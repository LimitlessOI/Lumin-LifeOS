/**
 * SYNOPSIS: Exports createConstellation — services/human-constellation.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Represents a Human Constellation, the canonical person model.
 * All OS products are projections of this graph.
 */
class HumanConstellation {
  constructor(personId) {
    if (!personId) {
      throw new Error('personId is required to create a Constellation.');
    }
    this.personId = personId;
    this.nodes = new Map(); // Stores node objects by ID
    this.edges = new Map(); // Stores edges in an adjacency list-like structure
    this.nextNodeId = 1;
  }

  /**
   * Adds a node to the constellation.
   * @param {string} type - The type of the node (e.g., 'value', 'goal').
   * @param {object} payload - The data associated with the node.
   * @returns {object} The created node object.
   * @private
   */
  _addNode(type, payload) {
    const id = `${type}-${this.nextNodeId++}`;
    const newNode = { id, type, payload, createdAt: new Date().toISOString() };
    this.nodes.set(id, newNode);
    this.edges.set(id, new Map()); // Initialize adjacency list for new node
    return newNode;
  }

  /**
   * Adds an edge between two nodes.
   * @param {string} fromId - The ID of the source node.
   * @param {string} toId - The ID of the target node.
   * @param {object} weights - An object containing edge weights (strength, stability, recency, etc.).
   * @private
   */
  _addEdge(fromId, toId, weights) {
    if (!this.nodes.has(fromId)) {
      throw new Error(`Node with ID ${fromId} not found.`);
    }
    if (!this.nodes.has(toId)) {
      throw new Error(`Node with ID ${toId} not found.`);
    }

    const edgeKey = `${fromId}->${toId}`;
    const existingEdges = this.edges.get(fromId);
    if (existingEdges) {
      existingEdges.set(toId, { ...weights, createdAt: new Date().toISOString() });
    } else {
      this.edges.set(fromId, new Map([[toId, { ...weights, createdAt: new Date().toISOString() }]]));
    }
  }

  /**
   * Updates an existing edge's weights.
   * @param {string} fromId - The ID of the source node.
   * @param {string} toId - The ID of the target node.
   * @param {object} update - Partial update object for edge weights.
   * @private
   */
  _updateEdge(fromId, toId, update) {
    const sourceEdges = this.edges.get(fromId);
    if (sourceEdges && sourceEdges.has(toId)) {
      const currentEdge = sourceEdges.get(toId);
      sourceEdges.set(toId, { ...currentEdge, ...update, updatedAt: new Date().toISOString() });
    } else {
      throw new Error(`Edge from ${fromId} to ${toId} not found.`);
    }
  }
}

/**
 * Creates a new HumanConstellation instance for a given personId.
 * @param {string} personId - The unique identifier for the person.
 * @returns {HumanConstellation} A new HumanConstellation instance.
 */
export function createConstellation(personId) {
  return new HumanConstellation(personId);
}

const VALID_NODE_TYPES = new Set([
  'value', 'goal', 'need', 'belief', 'pattern', 'state', 'trigger', 'resource', 'risk', 'avoidance'
]);

/**
 * Adds an observation to the constellation. This creates a new node in the graph.
 * @param {HumanConstellation} constellation - The constellation to add the observation to.
 * @param {string} nodeType - The type of node to create (e.g., 'value', 'goal'). Must be one of VALID_NODE_TYPES.
 * @param {object} payload - The data associated with the observation.
 * @returns {object} The newly created node object.
 * @throws {Error} If the nodeType is invalid.
 */
export function addObservation(constellation, nodeType, payload) {
  if (!constellation || !(constellation instanceof HumanConstellation)) {
    throw new Error('Invalid constellation object provided.');
  }
  if (!VALID_NODE_TYPES.has(nodeType)) {
    throw new Error(`Invalid node type: ${nodeType}. Must be one of: ${Array.from(VALID_NODE_TYPES).join(', ')}`);
  }
  return constellation._addNode(nodeType, payload);
}

/**
 * Weights or updates an edge between two nodes in the constellation.
 * If the edge does not exist, it will be created with the provided weights.
 * If it exists, its weights will be updated.
 * @param {HumanConstellation} constellation - The constellation to modify.
 * @param {string} fromId - The ID of the source node.
 * @param {string} toId - The ID of the target node.
 * @param {object} update - An object containing partial or full edge weights (strength, stability, recency, frequency, causal_confidence, source).
 * @throws {Error} If fromId or toId do not correspond to existing nodes.
 */
export function weightEdge(constellation, fromId, toId, update) {
  if (!constellation || !(constellation instanceof HumanConstellation)) {
    throw new Error('Invalid constellation object provided.');
  }

  const existingSourceEdges = constellation.edges.get(fromId);
  if (existingSourceEdges && existingSourceEdges.has(toId)) {
    constellation._updateEdge(fromId, toId, update);
  } else {
    constellation._addEdge(fromId, toId, update);
  }
}

/**
 * Projects a product-specific view of the constellation.
 * This is a placeholder for actual product-specific filtering and transformation logic.
 * @param {HumanConstellation} constellation - The constellation to project from.
 * @param {string} productId - The ID of the product (e.g., 'LifeOS', 'MarriageOS').
 * @returns {object} A product-specific view of the constellation.
 */
export function projectForProduct(constellation, productId) {
  if (!constellation || !(constellation instanceof HumanConstellation)) {
    throw new Error('Invalid constellation object provided.');
  }
  if (!productId) {
    throw new Error('productId is required for projection.');
  }

  // This is a placeholder for actual projection logic.
  // In a real implementation, this would involve:
  // 1. Filtering nodes/edges relevant to the productId.
  // 2. Transforming data schemas to match product-specific requirements.
  // 3. Potentially performing graph traversals or aggregations.

  // For now, return a simplified view or a filtered subset based on product ID.
  // Example: LifeOS might care about all nodes, MarriageOS might filter for 'value' and 'goal' nodes
  // that are tagged as 'relationship-related' (not yet implemented in this basic model).
  const projectedNodes = Array.from(constellation.nodes.values());
  const projectedEdges = [];
  for (const [fromId, targets] of constellation.edges.entries()) {
    for (const [toId, weights] of targets.entries()) {
      projectedEdges.push({ from: fromId, to: toId, weights });
    }
  }

  // Simple example: LifeOS gets the full graph, other products get a subset.
  switch (productId) {
    case 'LifeOS':
      return {
        personId: constellation.personId,
        nodes: projectedNodes,
        edges: projectedEdges,
        projectionNotes: `Full constellation view for ${productId}.`
      };
    case 'MarriageOS':
      // Example: Filter for nodes related to relationships or shared goals.
      // This would require additional metadata on nodes/edges, not in current basic payload.
      // For now, a generic filtered view.
      return {
        personId: constellation.personId,
        nodes: projectedNodes.filter(node => node.type === 'value' || node.type === 'goal' || node.type === 'need'),
        edges: projectedEdges, // Edges would also be filtered/transformed
        projectionNotes: `Filtered view for ${productId} (focus on values, goals, needs).`
      };
    case 'CareerOS':
      // Example: Filter for career-related goals, resources, risks.
      return {
        personId: constellation.personId,
        nodes: projectedNodes.filter(node => node.type === 'goal' || node.type === 'resource' || node.type === 'risk' || node.type === 'skill'), // 'skill' not in spec, example
        edges: projectedEdges,
        projectionNotes: `Filtered view for ${productId} (focus on career-related goals, resources, risks).`
      };
    default:
      return {
        personId: constellation.personId,
        nodes: projectedNodes,
        edges: projectedEdges,
        projectionNotes: `Default full constellation view for unknown product ID: ${productId}.`
      };
  }
}