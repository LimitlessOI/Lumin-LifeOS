/**
 * SYNOPSIS: STEP 5 proof — governed-factory enforcement fence. Proves the single
 * chokepoint blocks the ungoverned autonomous shipping path when
 * GOVERNED_FACTORY_ONLY is active, and permits it (no regression) when it is off.
 */
import { governedFactoryOnly, assertUngovernedShippingAllowed, GOVERNED_FACTORY_ONLY_ENV } from '../../services/governed-factory-guard.js';

const results = [];
const assert = (name, cond, detail = {}) => {
  results.push({ name, pass: Boolean(cond), ...detail });
  if (!cond) console.error('FAIL', name, JSON.stringify(detail));
  else console.log('PASS', name);
};

// OFF (default): ungoverned shipping permitted — no regression to the running loop.
delete process.env[GOVERNED_FACTORY_ONLY_ENV];
assert('default OFF => not governed-only', governedFactoryOnly() === false);
const off = assertUngovernedShippingAllowed('postBuilderBuild');
assert('default OFF => shipping allowed', off.allowed === true, { off });

// Each truthy spelling flips the fence ON and blocks shipping.
for (const val of ['1', 'true', 'yes', 'on', 'TRUE']) {
  process.env[GOVERNED_FACTORY_ONLY_ENV] = val;
  const on = assertUngovernedShippingAllowed('postBuilderBuild');
  assert(`ON via '${val}' => blocked fail-closed`, governedFactoryOnly() === true && on.allowed === false && on.reason === 'governed_factory_only', { on });
}

// Falsy / unset spellings do NOT fence (avoid accidentally halting the loop).
for (const val of ['0', 'false', 'no', '', 'off']) {
  process.env[GOVERNED_FACTORY_ONLY_ENV] = val;
  assert(`'${val}' => not fenced`, governedFactoryOnly() === false);
}

// The block carries a source label + actionable detail (points to the governed path).
process.env[GOVERNED_FACTORY_ONLY_ENV] = '1';
const blocked = assertUngovernedShippingAllowed('runProductExpansionCycle');
assert('block records source + governed-path detail', blocked.source === 'runProductExpansionCycle' && /factory\/execute-step/.test(blocked.detail), { blocked });

// The live loop entrypoints fail closed (no legacy /build call) when fenced on.
process.env[GOVERNED_FACTORY_ONLY_ENV] = '1';
const { runProductExpansionCycle, runProductExpansionLanes } = await import('../../services/never-stop-product-factory.js');
const cyc = await runProductExpansionCycle({ baseUrl: 'http://127.0.0.1:1/never-called', commandKey: 'x' });
assert('runProductExpansionCycle fenced => blocked, no ship', cyc.ok === false && cyc.blocked === true && cyc.reason === 'governed_factory_only', { cyc });
const lanes = await runProductExpansionLanes({ baseUrl: 'http://127.0.0.1:1/never-called', commandKey: 'x' });
assert('runProductExpansionLanes fenced => blocked, no ship', lanes.ok === false && lanes.blocked === true && lanes.reason === 'governed_factory_only', { lanes });

delete process.env[GOVERNED_FACTORY_ONLY_ENV];
const failed = results.filter((r) => !r.pass);
console.log(`\nGOVERNED-FACTORY-FENCE-PROOF: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
