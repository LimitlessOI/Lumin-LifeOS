/**
 * recordRevenueEvent + syncStripeRevenue — extracted from server.js.
 * Factory: createFinancialRevenue({ financialDashboard, incomeDroneSystem, updateROI, getStripeClient })
 */

/**
 * @param {{ financialDashboard: object, incomeDroneSystem: object, updateROI: function, getStripeClient: function }} deps
 */
export function createFinancialRevenue({ financialDashboard, incomeDroneSystem, updateROI, getStripeClient }) {
  async function recordRevenueEvent({
    source = "unknown",
    eventId = null,
    amount,
    currency = "USD",
    droneId = null,
    description = "",
    category = "general",
  }) {
    const cleanAmount = Number(amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new Error("Invalid amount for revenue event");
    }

    const desc =
      description ||
      `Revenue from ${source}${eventId ? ` (event ${eventId})` : ""}`;

    const tx = await financialDashboard.recordTransaction(
      "income",
      cleanAmount,
      desc,
      category || source,
      eventId
    );

    if (droneId) {
      await incomeDroneSystem.recordRevenue(droneId, cleanAmount, true); // ACTUAL revenue - real money
    } else {
      updateROI(cleanAmount, 0, 0);
    }

    return { tx, amount: cleanAmount, currency, source, droneId };
  }

  async function syncStripeRevenue() {
    try {
      const stripe = await getStripeClient();
      if (!stripe) {
        return;
      }

      console.log("💳 Syncing Stripe revenue into financial_ledger...");

      const paymentIntents = await stripe.paymentIntents.list({
        limit: 50,
      });

      for (const pi of paymentIntents.data || []) {
        if (pi.status !== "succeeded") continue;
        const amount = (pi.amount_received || pi.amount || 0) / 100;
        if (!amount) continue;

        await recordRevenueEvent({
          source: "stripe",
          eventId: pi.id,
          amount,
          currency: pi.currency || "usd",
          description: pi.description || "Stripe payment",
          category: "stripe_income",
        });
      }

      console.log("✅ Stripe revenue sync complete");
    } catch (err) {
      console.error("Stripe revenue sync error:", err.message);
    }
  }

  return { recordRevenueEvent, syncStripeRevenue };
}
