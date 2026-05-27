// services/builderos-patch-mode-policy.js
import { statSync, existsSync, readFileSync } from 'fs';
import { join, resolve, basename } from 'path';

const ZONE4_PATH_PREFIXES = ['startup/', 'mw/', 'core/', 'config/'];
const ZONE4_BASENAMES = ['server.js'];
const ZONE3_LINE_THRESHOLD = 150;
const ZONE2_LINE_THRESHOLD = 50;

export function classifyBuildTarget(filePath) {
  const resolvedPath = resolve(filePath);
  const basenamePath = basename(resolvedPath);

  if (ZONE4_PATH_PREFIXES.some((prefix) => resolvedPath.includes(prefix)) ||
      ZONE4_BASENAMES.includes(basenamePath)) {
    return {
      zone: 4,
      label: 'BLOCKED',
      allowBuilder: false,
      patchModeRequired: false,
      reason: 'Zone 4: startup/mw/core/config/server.js paths are blocked for all builder mutations',
      lineCount: 0,
    };
  }

  if (!existsSync(resolvedPath)) {
    return {
      zone: 1,
      label: 'SAFE',
      allowBuilder: true,
      patchModeRequired: false,
      reason: 'Zone 1: new file',
      lineCount: 0,
    };
  }

  let lineCount = 0;
  try {
    lineCount = readFileSync(resolvedPath, 'utf8').split('\n').length;
  } catch (error) {
    lineCount = 0;
  }

  if (lineCount > ZONE3_LINE_THRESHOLD) {
    return {
      zone: 3,
      label: 'DANGER',
      allowBuilder: false,
      patchModeRequired: true,
      reason: `Zone 3: file is ${lineCount} lines — builder will generate stub. Use extract-helper strategy.`,
      lineCount,
    };
  }

  if (lineCount >= ZONE2_LINE_THRESHOLD) {
    return {
      zone: 2,
      label: 'CAUTION',
      allowBuilder: true,
      patchModeRequired: false,
      reason: `Zone 2: file is ${lineCount} lines — builder may generate stub. Verify output immediately.`,
      lineCount,
    };
  }

  return {
    zone: 1,
    label: 'SAFE',
    allowBuilder: true,
    patchModeRequired: false,
    reason: `Zone 1: new file or under ${ZONE2_LINE_THRESHOLD} lines`,
    lineCount,
  };
}

export function generatePatchSpec(originalSpec, targetFile, currentLineCount) {
  return {
    patchSpec: `ZONE3_PATCH_MODE: target file has ${currentLineCount} lines. DO NOT rewrite the full file. Strategy: extract the new logic into a NEW helper file instead. Create a new file at services/builderos-${basename(targetFile, '.js')}-helper.js containing only the new functions. Then add a 2-line import to the original file. Spec for the new helper file: ${originalSpec}`,
    strategy: 'extract_to_helper',
    warning: 'Zone 3 surgical edits require GAP-FILL annotation if builder stubs. Use Zone 1 helper extraction to stay in safe scope.',
  };
}

export function validateOutputSafety(originalLineCount, newLineCount) {
  if (originalLineCount === 0 || newLineCount === 0) {
    return { safe: true, reason: 'line counts unavailable' };
  }

  if (originalLineCount > ZONE3_LINE_THRESHOLD && newLineCount < 30) {
    return { safe: false, reason: `line_count_collapse: was ${originalLineCount} lines now ${newLineCount} — full stub detected` };
  }

  if (newLineCount < originalLineCount * 0.5) {
    return { safe: false, reason: `output_truncated: new content is less than 50 percent of original (${newLineCount} vs ${originalLineCount} lines)` };
  }

  return { safe: true, reason: 'output size acceptable' };
}

// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
```

---

```json
{
  "target_file": null,
  "insert_after_line": null,
  "confidence": 1
}