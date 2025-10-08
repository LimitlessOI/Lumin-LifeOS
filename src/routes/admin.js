// src/routes/admin.js
import express from "express";

export const adminRouter = express.Router();

/**
 * POST /api/v1/admin/setup-client
 * Body: { business_name, contact_name, phone, email, hours, greeting }
 * For now: accept + return a stub "provisioned" response.
 * Protected by X-Command-Key at app level (server.js).
 */
adminRouter.post("/setup-client", async (req, res) => {
  const payload = req.body || {};
  if (!payload.business_name || !payload.phone || !payload.email) {
    return res.status(400).json({ ok: false, error: "missing_fields" });
  }
  return res.json({
    ok: true,
    message: "Client queued for setup.",
    test_number: process.env.TWILIO_PHONE_NUMBER || "",
    assistant_id: process.env.VAPI_ASSISTANT_ID || "",
    echo: payload,
  });
});
