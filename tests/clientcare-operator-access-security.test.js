/**
 * SYNOPSIS: Regression coverage for ClientCare zero-operator tenant authorization.
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClientCareSellableService } from '../services/clientcare-sellable-service.js';
import { canBootstrapClientCareTenant } from '../routes/clientcare-billing-routes.js';

function zeroOperatorService() {
  return createClientCareSellableService({
    pool: {
      async query(sql) {
        assert.match(sql, /clientcare_operator_access/);
        return { rows: [] };
      },
    },
    logger: { warn() {} },
  });
}

test('zero-operator tenants fail closed without explicit bootstrap authorization', async () => {
  const service = zeroOperatorService();
  const access = await service.resolveOperatorAccess({
    tenantId: null,
    operatorEmail: 'member@example.com',
  });

  assert.equal(access.enforced, true);
  assert.equal(access.allowed, false);
  assert.equal(access.reason, 'tenant_not_provisioned');
  await assert.rejects(
    service.assertOperatorAccess({
      tenantId: null,
      operatorEmail: 'member@example.com',
      roles: ['operator', 'manager'],
    }),
    /Active operator access required/,
  );
});

test('trusted bootstrap remains available for the founder path', async () => {
  const service = zeroOperatorService();
  const access = await service.assertOperatorAccess({
    tenantId: null,
    operatorEmail: 'adam@limitlessoi.com',
    roles: ['operator', 'manager'],
    allowBootstrapWhenNoOperators: true,
  });

  assert.equal(access.allowed, true);
  assert.equal(access.bootstrap, true);
});

test('ordinary member JWTs cannot bootstrap default or named tenants', () => {
  const member = {
    auth_mode: 'account_jwt',
    lifeosUser: { role: 'member', sub: 'member-1' },
  };

  assert.equal(canBootstrapClientCareTenant(member, { tenantId: null }), false);
  assert.equal(canBootstrapClientCareTenant(member, {
    tenantId: '42',
    explicitBootstrap: true,
  }), false);
});

test('founder access preserves default practice and explicit first-operator setup', () => {
  const founder = {
    auth_mode: 'command_key_fallback',
    lifeosUser: { role: 'founder_admin', sub: 'emergency-key' },
  };

  assert.equal(canBootstrapClientCareTenant(founder, { tenantId: null }), true);
  assert.equal(canBootstrapClientCareTenant(founder, { tenantId: '42' }), false);
  assert.equal(canBootstrapClientCareTenant(founder, {
    tenantId: '42',
    explicitBootstrap: true,
  }), true);
});
