// worker-loop.js - Persistent Pod Worker Loop
const APP = process.env.PUBLIC_BASE_URL || "https://robust-magic-production.up.railway.app";
const KEY = process.env.COMMAND_CENTER_KEY || "MySecretKey2025LifeOS";

console.log('[worker-loop] Starting persistent worker...');
console.log(`[worker-loop] Target: ${APP}`);

async function keepWorkersAlive() {
  while (true) {
    try {
      const res = await fetch(`${APP}/internal/autopilot/build-now?key=${KEY}`, {
        method: 'POST'
      });
      
      const data = await res.json();
      console.log(`[worker-loop] Trigger sent: ${res.status} - ${data.message || 'no message'}`);
    } catch (e) {
      console.error('[worker-loop] Error:', e.message);
    }
    
    // Wait 60 seconds before next trigger
    await new Promise(r => setTimeout(r, 60000));
  }
}

// Start the loop
keepWorkersAlive();
