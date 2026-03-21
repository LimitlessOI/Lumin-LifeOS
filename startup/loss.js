export function createLossTracker({ pool, logger, createSystemSnapshot }) {
  return async function trackLoss(
    severity,
    whatWasLost,
    whyLost,
    context = {},
    prevention = ""
  ) {
    try {
      await pool.query(
        `INSERT INTO loss_log (severity, what_was_lost, why_lost, context, prevention_strategy, timestamp)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [severity, whatWasLost, whyLost, JSON.stringify(context), prevention]
      );
      if (severity === "critical") {
        logger.error(`🚨 [${severity.toUpperCase()}] ${whatWasLost}`);
        await createSystemSnapshot(`Critical loss: ${whatWasLost}`);
      }
    } catch (error) {
      logger.error("Loss tracking error:", { error: error.message });
    }
  };
}
