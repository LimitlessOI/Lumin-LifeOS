/**
 * SYNOPSIS: IDE bridge — expose BuilderOS commands over HTTP/WebSocket for editor integration.
 * Run: node scripts/ide-bridge.mjs [PORT]
 * Endpoints:
 *   POST /command { command: "bp-priority:once" | "drift-repair" | "preflight" }
 *   GET  /health
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import http from 'node:http';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.IDE_BRIDGE_PORT) || Number(process.argv[2]) || 19421;

const COMMANDS = {
  'bp-priority:once': ['npm', ['run', 'builderos:bp-priority:once']],
  'drift-repair': ['node', ['scripts/build-queue-drift-repair.mjs', '--apply']],
  'preflight': ['npm', ['run', 'builder:preflight']],
  'health': ['node', ['-e', 'console.log("ok")']],
};

function runCommand(name, cwd) {
  const [cmd, args] = COMMANDS[name] || [null, []];
  if (!cmd) return Promise.resolve({ ok: false, error: `unknown command: ${name}` });
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: process.env, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      resolve({ ok: code === 0, exit_code: code, stdout: stdout.slice(0, 2000), stderr: stderr.slice(0, 1000) });
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'builderos-ide-bridge', port: PORT }));
    return;
  }
  if (req.method === 'POST' && req.url === '/command') {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', async () => {
      try {
        const { command } = JSON.parse(body || '{}');
        const result = await runCommand(command, process.cwd());
        res.writeHead(result.ok ? 200 : 500, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
      } catch (err) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`BuilderOS IDE bridge listening on http://localhost:${PORT}`);
  });
}

export { server };
