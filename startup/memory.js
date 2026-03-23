/**
 * @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md
 */
export function createMemoryHandlers({ pool, logger }) {
  async function storeConversationMemory(orchestratorMessage, aiResponse, context = {}) {
    try {
      const memId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        `INSERT INTO conversation_memory
         (memory_id, orchestrator_msg, ai_response, context_metadata, memory_type, ai_member, created_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, now())`,
        [
          memId,
          orchestratorMessage,
          aiResponse,
          JSON.stringify(context),
          JSON.stringify({
            type: context.type || "conversation",
            importance: context.importance || "medium",
            source: context.source || "system",
          }),
          context.ai_member || "system",
        ]
      );
      return { memId };
    } catch (error) {
      logger.error("❌ Memory store error:", { error: error.message });
      return null;
    }
  }

  async function recallConversationMemory(query, limit = 50) {
    try {
      const result = await pool.query(
        `SELECT memory_id, orchestrator_msg, ai_response, ai_member, created_at 
         FROM conversation_memory
         WHERE orchestrator_msg ILIKE $1 OR ai_response ILIKE $1
         ORDER BY created_at DESC LIMIT $2`,
        [`%${query}%`, limit]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  return {
    storeConversationMemory,
    recallConversationMemory,
  };
}
