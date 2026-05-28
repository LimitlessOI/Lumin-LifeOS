import { runBuildPipeline } from './builderos-build-pipeline.js';
import { spawnSync } from 'child_process';
import { join, tmpdir } from 'path';
import { fileURLToPath } from 'url';

const tempDir = tmpdir();
const tempFile = join(tempDir, 'verifier-temp.txt');

async function runUnifiedVerifierOnContent(content) {
  const output = spawnSync('node', [fileURLToPath(import.meta.url).replace(/\.js$/, '.mjs')], {
    input: content,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  if (output.status === 0) {
    return true;
  }
  return false;
}

async function runPrecommitGovernance() {
  try {
    const result = await runBuildPipeline();
    if (result === 'success') {
      const content = await import('fs').promises.readFile('temp.txt', 'utf8');
      const verifierResult = await runUnifiedVerifierOnContent(content);
      if (verifierResult) {
        return { allow_commit: true };
      } else {
        return { block_commit: true };
      }
    } else {
      return { block_commit: true };
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { retry_once: true };
    } else {
      return { block_commit: true };
    }
  }
}

export { runPrecommitGovernance };