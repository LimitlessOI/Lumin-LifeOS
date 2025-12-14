const { exec } = require('child_process');

describe('Migration Tests', () => {
  it('should run migrations without errors', (done) => {
    exec('node-pg-migrate up', (error, stdout, stderr) => {
      expect(stderr).toBe('');
      expect(stdout).toContain('DONE');
      done();
    });
  });

  it('should rollback migrations without errors', (done) => {
    exec('node-pg-migrate down', (error, stdout, stderr) => {
      expect(stderr).toBe('');
      expect(stdout).toContain('DONE');
      done();
    });
  });
});