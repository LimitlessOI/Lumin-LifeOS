import express from "express";

const app = express();
app.use(express.json({ limit: "5mb" }));

// Change if your local LLM is on a different port/path
const UPSTREAM_URL = process.env.UPSTREAM_URL || "http://localhost:1234/v1/chat/completions";
const PORT = Number(process.env.BRIDGE_PORT || 3333);

// Accepts OpenAI-style chat and forwards to your local LLM
app.post("/api/v1/chat", async (req, res) => {
  try {
    const r = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.UPSTREAM_API_KEY ? { "Authorization": `Bearer ${process.env.UPSTREAM_API_KEY}` } : {})
      },
      body: JSON.stringify(req.body || {})
    });
    const txt = await r.text();
    try {
      res.status(r.status).json(JSON.parse(txt));
    } catch {
      res.status(r.status).type("application/json").send(txt);
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/health", (_req, res) => res.send("OK"));
app.listen(PORT, async () => {
  console.log(`DeepSeek Bridge on http://localhost:${PORT} -> ${UPSTREAM_URL}`);

  // Auto-register with the server (optional but recommended)
  const SERVER_URL = process.env.SERVER_URL; // e.g. https://robust-magic-production.up.railway.app
  const COMMAND_KEY = process.env.COMMAND_KEY || "MySecretKey2025LifeOS";
  const BRIDGE_PUBLIC_URL = process.env.BRIDGE_PUBLIC_URL; // your tunnel URL (https://...ngrok... or https://...loca.lt)

  if (SERVER_URL && BRIDGE_PUBLIC_URL) {
    try {
      const res = await fetch(`${SERVER_URL.replace(/\/$/, "")}/api/v1/bridge/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-command-key": COMMAND_KEY },
        body: JSON.stringify({ url: BRIDGE_PUBLIC_URL })
      });
      const body = await res.text();
      console.log("🔌 Bridge registered:", body);
    } catch (e) {
      console.error("Bridge register failed:", e.message);
    }
  } else {
    console.log("ℹ️ To auto-register, set SERVER_URL and BRIDGE_PUBLIC_URL env vars.");
  }
});
