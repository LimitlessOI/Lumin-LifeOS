/**
 * SYNOPSIS: Exports createInstitutionalConstellation — services/institutional-constellation.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const version = "2026-08-02";

let nextNodeId = 1;

/**
 * Creates a new node object.
 * @param {string} type - The type of the node.
 * @param {any} payload - The data associated with the node.
 * @returns {object} The new node object.
 */
function createNode(type, payload) {
  return {
    id: `node-${nextNodeId++}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a fresh institutional constellation object with maps for nodes and edges.
 * @returns {object} A new institutional constellation.
 */
export function createInstitutionalConstellation() {
  return {
    nodes: new Map(),
    edges: new Map(),
  };
}

/**
 * Adds a node of type `belief` and returns the node.
 * @param {object} constellation - The institutional constellation.
 * @param {string} belief - The belief string.
 * @param {Array<string>} [evidence=[]] - List of evidence strings.
 * @param {number} [confidence=0.5] - Confidence in the belief.
 * @returns {object} The new belief node.
 */
export function addBelief(constellation, belief, evidence = [], confidence = 0.5) {
  const node = createNode("belief", { belief, evidence, confidence });
  constellation.nodes.set(node.id, node);
  return node;
}

/**
 * Adds a node of type `office` with payload { officeId, ...attributes } and returns the node.
 * @param {object} constellation - The institutional constellation.
 * @param {string} officeId - The ID of the office.
 * @param {object} [attributes={}] - Additional attributes for the office.
 * @returns {object} The new office node.
 */
export function addOffice(constellation, officeId, attributes = {}) {
  const node = createNode("office", { officeId, ...attributes });
  constellation.nodes.set(node.id, node);
  return node;
}

/**
 * Adds a node of type `product` with payload { productId, ...attributes } and returns the node.
 * @param {object} constellation - The institutional constellation.
 * @param {string} productId - The ID of the product.
 * @param {object} [attributes={}] - Additional attributes for the product.
 * @returns {object} The new product node.
 */
export function addProduct(constellation, productId, attributes = {}) {
  const node = createNode("product", { productId, ...attributes });
  constellation.nodes.set(node.id, node);
  return node;
}

/**
 * Creates or updates a weighted edge.
 * @param {object} constellation - The institutional constellation.
 * @param {string} fromNodeId - The ID of the source node.
 * @param {string} toNodeId - The ID of the target node.
 * @param {object} [weights={}] - Custom weights for the edge.
 * @returns {object|null} The created or updated edge, or null if nodes are not found.
 */
export function weightAgreement(constellation, fromNodeId, toNodeId, weights = {}) {
  if (!constellation.nodes.has(fromNodeId) || !constellation.nodes.has(toNodeId)) {
    return null; // Nodes not found
  }

  const defaultWeights = {
    strength: 0.5,
    stability: 0.5,
    recency: new Date().toISOString(),
    frequency: 1,
    causal_confidence: 0.0,
    source: "unknown",
  };

  const edgeId = `${fromNodeId}-${toNodeId}`;
  let edge = constellation.edges.get(edgeId);

  if (edge) {
    // Update existing edge
    edge.weights = { ...edge.weights, ...weights, recency: new Date().toISOString(), frequency: (edge.weights.frequency || 0) + 1 };
  } else {
    // Create new edge
    edge = {
      id: edgeId,
      from: fromNodeId,
      to: toNodeId,
      weights: { ...defaultWeights, ...weights },
      createdAt: new Date().toISOString(),
    };
  }

  constellation.edges.set(edgeId, edge);
  return edge;
}

/**
 * Adds a node of type `prediction` and links it from the named office.
 * @param {object} constellation - The institutional constellation.
 * @param {string} officeId - The ID of the office making the prediction.
 * @param {string} prediction - The prediction string.
 * @param {number} [confidence=0.5] - The confidence in the prediction.
 * @returns {object|null} The new prediction node, or null if office not found.
 */
export function recordPrediction(constellation, officeId, prediction, confidence = 0.5) {
  if (!constellation.nodes.has(officeId) || constellation.nodes.get(officeId).type !== "office") {
    return null;
  }

  const node = createNode("prediction", { prediction, confidence });
  constellation.nodes.set(node.id, node);

  weightAgreement(constellation, officeId, node.id, { strength: confidence, source: officeId });
  return node;
}

/**
 * Adds a node of type `outcome` and links it from the prediction.
 * @param {object} constellation - The institutional constellation.
 * @param {string} predictionId - The ID of the prediction node.
 * @param {object} outcome - The outcome data, potentially with a `matching_score`.
 * @returns {object|null} The new outcome node, or null if prediction not found.
 */
export function recordOutcome(constellation, predictionId, outcome) {
  const predictionNode = constellation.nodes.get(predictionId);
  if (!predictionNode || predictionNode.type !== "prediction") {
    return null;
  }

  const outcomeNode = createNode("outcome", outcome);
  constellation.nodes.set(outcomeNode.id, outcomeNode);

  let accuracy = 0.5;
  if (typeof predictionNode.payload.confidence === "number" && typeof outcome.matching_score === "number") {
    accuracy = 1 - Math.abs(predictionNode.payload.confidence - outcome.matching_score);
  }

  weightAgreement(constellation, predictionId, outcomeNode.id, { accuracy });
  return outcomeNode;
}

/**
 * Returns a calibration report for the constellation.
 * @param {object} constellation - The institutional constellation.
 * @returns {object} The calibration report.
 */
export function getCalibrationReport(constellation) {
  let totalConfidence = 0;
  let confidentPredictions = 0; // Predictions with confidence > 0.9
  let accurateConfidentPredictions = 0; // Confident predictions with accuracy > 0.8
  let totalPredictions = 0;
  let totalAccuracy = 0;
  let accuracyCount = 0;

  const officePredictions = new Map(); // officeId -> { predictions: count, totalConfidence: sum, totalAccuracy: sum, accuracyCount: count }

  for (const node of constellation.nodes.values()) {
    if (node.type === "belief" || node.type === "prediction") {
      totalConfidence += node.payload.confidence || 0;
    }
    if (node.type === "prediction") {
      totalPredictions++;
    }
  }

  for (const edge of constellation.edges.values()) {
    const fromNode = constellation.nodes.get(edge.from);
    const toNode = constellation.nodes.get(edge.to);

    if (fromNode && fromNode.type === "office" && toNode && toNode.type === "prediction") {
      const officeId = fromNode.payload.officeId;
      if (!officePredictions.has(officeId)) {
        officePredictions.set(officeId, { predictions: 0, totalConfidence: 0, totalAccuracy: 0, accuracyCount: 0 });
      }
      const officeStats = officePredictions.get(officeId);
      officeStats.predictions++;
      officeStats.totalConfidence += toNode.payload.confidence || 0;
    }

    if (fromNode && fromNode.type === "prediction" && toNode && toNode.type === "outcome") {
      if (typeof edge.weights.accuracy === "number") {
        totalAccuracy += edge.weights.accuracy;
        accuracyCount++;

        const predictionConfidence = fromNode.payload.confidence || 0;
        if (predictionConfidence > 0.9) {
          confidentPredictions++;
          if (edge.weights.accuracy > 0.8) {
            accurateConfidentPredictions++;
          }
        }

        // Link accuracy back to the office that made the prediction
        for (const officeEdge of constellation.edges.values()) {
          if (officeEdge.to === fromNode.id && constellation.nodes.get(officeEdge.from)?.type === "office") {
            const officeId = constellation.nodes.get(officeEdge.from).payload.officeId;
            const officeStats = officePredictions.get(officeId);
            if (officeStats) {
              officeStats.totalAccuracy += edge.weights.accuracy;
              officeStats.accuracyCount++;
            }
          }
        }
      }
    }
  }

  const total_nodes = constellation.nodes.size;
  const total_edges = constellation.edges.size;
  const average_confidence = total_nodes > 0 ? totalConfidence / total_nodes : 0;
  const agreement_index = total_edges > 0 ? (total_edges / (total_nodes * (total_nodes - 1) / 2 || 1)) : 0; // Density of the graph
  const accuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0.5; // Default if no outcomes

  const overconfident_offices = [];
  const underconfident_offices = [];

  for (const [officeId, stats] of officePredictions.entries()) {
    if (stats.accuracyCount > 0) {
      const avgConfidence = stats.totalConfidence / stats.predictions;
      const avgAccuracy = stats.totalAccuracy / stats.accuracyCount;
      if (avgConfidence - avgAccuracy > 0.2) { // Threshold for overconfidence
        overconfident_offices.push({ officeId, avgConfidence, avgAccuracy });
      } else if (avgAccuracy - avgConfidence > 0.2) { // Threshold for underconfidence
        underconfident_offices.push({ officeId, avgConfidence, avgAccuracy });
      }
    }
  }

  let summary = `Constellation has ${total_nodes} nodes and ${total_edges} edges. Average confidence: ${average_confidence.toFixed(2)}.`;
  if (accuracyCount > 0) {
    summary += ` Prediction accuracy: ${accuracy.toFixed(2)}.`;
  }

  return {
    total_nodes,
    total_edges,
    average_confidence,
    agreement_index,
    accuracy,
    overconfident_offices,
    underconfident_offices,
    summary,
  };
}

/**
 * Returns an array of drift signals.
 * @param {object} constellation - The institutional constellation.
 * @returns {Array<object>} An array of drift signals.
 */
export function getDriftSignals(constellation) {
  const driftSignals = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString();

  // Contradictions (edges with strength < 0 between same-type nodes)
  for (const edge of constellation.edges.values()) {
    const fromNode = constellation.nodes.get(edge.from);
    const toNode = constellation.nodes.get(edge.to);
    if (fromNode && toNode && fromNode.type === toNode.type && edge.weights.strength < 0) {
      driftSignals.push({
        type: "contradiction",
        description: `Contradiction between ${fromNode.type} nodes ${fromNode.id} and ${toNode.id} with strength ${edge.weights.strength}.`,
        nodes: [fromNode.id, toNode.id],
      });
    }
  }

  // Overconfidence (prediction confidence > 0.9 with no outcome)
  for (const node of constellation.nodes.values()) {
    if (node.type === "prediction" && node.payload.confidence > 0.9) {
      const hasOutcome = Array.from(constellation.edges.values()).some(
        (edge) => edge.from === node.id && constellation.nodes.get(edge.to)?.type === "outcome"
      );
      if (!hasOutcome) {
        driftSignals.push({
          type: "overconfidence",
          description: `Prediction ${node.id} has high confidence (${node.payload.confidence}) but no recorded outcome.`,
          nodes: [node.id],
        });
      }
    }
  }

  // Stale edges (recency older than 30 days)
  for (const edge of constellation.edges.values()) {
    if (edge.weights.recency && edge.weights.recency < thirtyDaysAgo) {
      driftSignals.push({
        type: "stale_edge",
        description: `Edge ${edge.id} is stale, last updated on ${edge.weights.recency}.`,
        nodes: [edge.from, edge.to],
      });
    }
  }

  // Fading agreement (strength < 0.2 and frequency > 5)
  for (const edge of constellation.edges.values()) {
    if (edge.weights.strength < 0.2 && edge.weights.frequency > 5) {
      driftSignals.push({
        type: "fading_agreement",
        description: `Agreement for edge ${edge.id} is fading (strength: ${edge.weights.strength}, frequency: ${edge.weights.frequency}).`,
        nodes: [edge.from, edge.to],
      });
    }
  }

  return driftSignals;
}

/**
 * Returns nodes with confidence < 0.3 or evidence.length < 2, sorted by confidence ascending.
 * @param {object} constellation - The institutional constellation.
 * @returns {Array<object>} An array of blind spot nodes.
 */
export function getBlindSpots(constellation) {
  const blindSpots = [];
  for (const node of constellation.nodes.values()) {
    const confidence = node.payload.confidence;
    const evidenceLength = Array.isArray(node.payload.evidence) ? node.payload.evidence.length : 0;

    if (confidence < 0.3 || evidenceLength < 2) {
      blindSpots.push(node);
    }
  }
  return blindSpots.sort((a, b) => (a.payload.confidence || 0) - (b.payload.confidence || 0));
}

/**
 * Returns a short human-readable overview string with node counts by type and a top drift signal if any.
 * @param {object} constellation - The institutional constellation.
 * @returns {string} The constellation summary.
 */
export function getConstellationSummary(constellation) {
  const nodeCounts = {};
  for (const node of constellation.nodes.values()) {
    nodeCounts[node.type] = (nodeCounts[node.type] || 0) + 1;
  }

  let summary = "Node counts by type: ";
  for (const type in nodeCounts) {
    summary += `${type}: ${nodeCounts[type]}, `;
  }
  summary = summary.slice(0, -2) + ".";

  const driftSignals = getDriftSignals(constellation);
  if (driftSignals.length > 0) {
    summary += ` Top drift signal: ${driftSignals[0].type} - ${driftSignals[0].description}`;
  } else {
    summary += " No significant drift signals detected.";
  }

  return summary;
}