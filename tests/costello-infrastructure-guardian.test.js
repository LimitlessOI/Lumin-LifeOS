import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const serviceText = fs.readFileSync(new URL('../services/costello-infrastructure-guardian.js', import.meta.url), 'utf8');
const autoRegisterText = fs.readFileSync(new URL('../startup/auto-register-product-modules.js', import.meta.url), 'utf8');

test('Costello infrastructure guardian targets independent repo and service', () => {
  assert.match(serviceText, /costello-builderos/);
  assert.match(serviceText, /LimitlessOI\/Lumin-LifeOS-BuilderOS-B/);
  assert.match(serviceText, /serviceCreate/);
  assert.match(serviceText, /source:\s*\{\s*repo:\s*COSTELLO_REPO\s*\}/);
});

test('Costello guardian is external to the Costello process and requires manufacturing proof', () => {
  assert.match(serviceText, /external_to_costello_process:\s*true/);
  assert.match(serviceText, /manufacturing_proven\s*===\s*true/);
  assert.match(serviceText, /catastrophic_failure\s*===\s*false/);
  assert.match(serviceText, /serviceInstanceDeploy/);
});

test('Costello guardian never hardcodes Abbott public domain as Costello target', () => {
  assert.doesNotMatch(serviceText, /lumin-web-production-e3a9\.up\.railway\.app/);
  assert.match(serviceText, /serviceDomainCreate/);
});

test('Costello guardian is a required Abbott runtime module', () => {
  assert.match(autoRegisterText, /routes\/costello-infrastructure-guardian-routes\.js/);
  assert.match(autoRegisterText, /registerCostelloInfrastructureGuardianRoutes/);
});
