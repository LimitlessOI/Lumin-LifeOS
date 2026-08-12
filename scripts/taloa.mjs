#!/usr/bin/env node
// SYNOPSIS: CLI for the Taloa overlay command channel (native macOS app).
// The channel itself is a JSON file drop at /tmp/taloa-cmd with the receipt
// written to /tmp/taloa-cmd-result -- fine for a machine, miserable to type by
// hand, and the quoting defeats npm scripts. This is the human/script seam.
//
// Usage:
//   node scripts/taloa.mjs state
//   node scripts/taloa.mjs point 960 1900 "click target"
//   node scripts/taloa.mjs highlight 660 1460 600 320 "the thing I mean"
//   node scripts/taloa.mjs caption "reading your screen now"
//   node scripts/taloa.mjs capture-all [dir]
//   node scripts/taloa.mjs capture <displayIndex> [path]
//   node scripts/taloa.mjs click 960 1900 "sign in button"
//   node scripts/taloa.mjs clear
//
// Coordinates are CG global: top-left origin, y down, spanning every display.
// `state` prints each display's bounds so the space is discoverable rather
// than guessed.

/**
 * Taloa overlay command-channel CLI.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CMD = '/tmp/taloa-cmd';
const RESULT = '/tmp/taloa-cmd-result';

const [op, ...args] = process.argv.slice(2);
const num = (v) => (v === undefined ? undefined : Number(v));

function build() {
  switch (op) {
    case 'state':
    case 'clear':
      return { op };
    case 'point':
      return { op, x: num(args[0]), y: num(args[1]), label: args[2] ?? '', seconds: num(args[3]) ?? 4 };
    case 'highlight':
      return {
        op,
        rect: [num(args[0]), num(args[1]), num(args[2]), num(args[3])],
        label: args[4] ?? '',
        seconds: num(args[5]) ?? 4,
      };
    case 'spotlight':
      return {
        op,
        rect: [num(args[0]), num(args[1]), num(args[2]), num(args[3])],
        label: args[4] ?? '',
        seconds: num(args[5]) ?? 4,
      };
    case 'arrow':
      return {
        op,
        from_x: num(args[0]),
        from_y: num(args[1]),
        to_x: num(args[2]),
        to_y: num(args[3]),
        label: args[4] ?? '',
        seconds: num(args[5]) ?? 4,
      };
    case 'walkthrough': {
      // Steps come from a file: a multi-step tour is far past what survives
      // shell quoting, and a file is also replayable and diffable.
      const source = args[0];
      if (!source) return null;
      const steps = JSON.parse(fs.readFileSync(source, 'utf8'));
      return { op, steps: Array.isArray(steps) ? steps : steps.steps };
    }
    case 'caption':
      return { op, text: args[0] ?? '', seconds: num(args[1]) ?? 5 };
    case 'capture':
      return { op, display: num(args[0]) ?? 1, path: args[1] ?? `/tmp/taloa-display-${args[0] ?? 1}.png` };
    case 'capture-all':
      return { op: 'capture_all', dir: args[0] ?? '/tmp/taloa-frames' };
    case 'click':
      return { op, x: num(args[0]), y: num(args[1]), label: args[2] ?? 'click here', show_first: true };
    case 'type':
      return { op, x: num(args[0]), y: num(args[1]), text: args[2] ?? '', press_return: args[3] === 'return' };
    default:
      return null;
  }
}

const command = build();
if (!command) {
  console.error('unknown op. supported: state point highlight spotlight arrow walkthrough <steps.json> caption capture capture-all click type clear');
  process.exit(2);
}

// The app is the only writer of the result file, so clearing it first means a
// stale receipt from a previous call can never be misread as this call's answer.
try { fs.rmSync(RESULT, { force: true }); } catch { /* nothing to clear */ }

const requestId = `cli-${Date.now()}`;
fs.writeFileSync(CMD, JSON.stringify({ ...command, request_id: requestId }));

// A walkthrough only writes its receipt after the last step has played, so the
// wait has to cover the tour it just asked for, not a fixed 20s.
const budgetMs = command.op === 'walkthrough'
  ? command.steps.reduce((total, step) => total + ((Number(step.seconds) || 3) + 0.25) * 1000, 10_000)
  : 20_000;
const deadline = Date.now() + budgetMs;
while (Date.now() < deadline) {
  await sleep(200);
  if (!fs.existsSync(RESULT)) continue;
  const raw = fs.readFileSync(RESULT, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { continue; }
  if (parsed.request_id !== requestId) continue; // someone else's receipt
  console.log(raw.trim());
  process.exit(parsed.ok === false ? 1 : 0);
}

console.error(`no receipt within ${Math.round(budgetMs / 1000)}s -- is Taloa.app running? (open native/macos-overlay/build/Taloa.app)`);
process.exit(1);
