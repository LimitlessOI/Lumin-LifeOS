// src/routes/admin.js (FULL)
import express from "express";

export const adminRouter = express.Router();

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
