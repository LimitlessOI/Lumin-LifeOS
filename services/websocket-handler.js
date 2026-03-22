/**
 * WebSocket connection handler — extracted from server.js.
 */

/**
 * @param {import('ws').WebSocketServer} wss
 * @param {{ activeConnections: Map, conversationHistory: Map, logger: object, pool: object, broadcastToAll: function, detectBlindSpots: function, callCouncilWithFailover: function, systemMetrics: object, DEEPSEEK_BRIDGE_ENABLED: string, STRIPE_SECRET_KEY: string }} deps
 */
export function setupWebSocketHandler(wss, {
  activeConnections,
  conversationHistory,
  logger,
  pool,
  broadcastToAll,
  detectBlindSpots,
  callCouncilWithFailover,
  systemMetrics,
  DEEPSEEK_BRIDGE_ENABLED,
  STRIPE_SECRET_KEY,
}) {
  wss.on("connection", (ws) => {
    const clientId = `ws_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    activeConnections.set(clientId, ws);
    conversationHistory.set(clientId, []);

    logger.info(`✅ [WS] ${clientId} connected`);

    ws.send(
      JSON.stringify({
        type: "connection",
        status: "connected",
        clientId,
        message: "🎼 LifeOS v26.1 (no Claude) - Consensus Protocol Ready",
        systemMetrics,
        features: {
          consensusProtocol: true,
          blindSpotDetection: true,
          dailyIdeas: true,
          aiRotation: true,
          sandboxTesting: true,
          rollbackCapability: true,
          ollamaBridge: DEEPSEEK_BRIDGE_ENABLED === "true",
          stripeRevenueSync: Boolean(STRIPE_SECRET_KEY),
        },
      })
    );

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "chat") {
          const text = msg.text || msg.message || msg.content;
          const member = msg.member || "chatgpt";

          if (!text) return;

          try {
            const blindSpots = await detectBlindSpots(text, {
              source: "websocket",
            });

            const response = await callCouncilWithFailover(text, member);
            ws.send(
              JSON.stringify({
                type: "response",
                response,
                member,
                blindSpotsDetected: blindSpots.length,
                timestamp: new Date().toISOString(),
              })
            );
          } catch (error) {
            ws.send(
              JSON.stringify({
                type: "error",
                error: error.message,
              })
            );
          }
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: "error", error: error.message }));
      }
    });

    ws.on("close", () => {
      activeConnections.delete(clientId);
      conversationHistory.delete(clientId);
      logger.info(`👋 [WS] ${clientId} disconnected`);
    });
  });
}
