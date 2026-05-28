import { fileURLToPath } from 'url';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';

const scriptsDir = join(fileURLToPath(import.meta.url).replace(/\.js$/, ""), 'scripts');

function runUnifiedVerifierOnContent(content, originalLines = null) {
  const tempPath = join(tmpdir(), 'temp.js');
  const writer = fs.createWriteStream(tempPath);
  writer.write(content);
  writer.end();
  const result = spawnSync('node', [join(scriptsDir, 'builderos-builder-output-verifier.mjs'), tempPath]);
  const stdout = result.stdout.toString();
  const stderr = result.stderr.toString();
  const ok = result.status === 0;
  return {
    ok,
    status: result.status,
    stdout,
    stderr,
    tempPath,
  };
}

function runBuildPipeline(opts) {
  const result = spawnSync('node', [join(scriptsDir, 'builderos-builder.mjs'), ...opts]);
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function runPrecommitGovernance(opts) {
  const buildResult = runBuildPipeline(opts);
  if (!buildResult.ok) {
    return { decision: 'block_commit', ...buildResult };
  }
  const verifierResult = runUnifiedVerifierOnContent(readFileSync('temp.txt', 'utf8'));
  if (!verifierResult.ok) {
    return { decision: 'block_commit', ...verifierResult, finalOutput: readFileSync('temp.txt', 'utf8') };
  }
  return { decision: 'allow_commit', finalOutput: readFileSync('temp.txt', 'utf8') };
}

export { runUnifiedVerifierOnContent, runPrecommitGovernance };