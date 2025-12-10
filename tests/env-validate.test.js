const { execSync } = require('child_process');

test('Environment validation script should pass', () => {
  const output = execSync('node scripts/env-validate.js', { encoding: 'utf8' });
  expect(output).toContain('Environment validation passed.');
});