const { exec } = require('child_process');

function runMigrations() {
  exec('node-pg-migrate up', (err, stdout, stderr) => {
    if (err) {
      console.error(`Migration error: ${stderr}`);
      return;
    }
    console.log(`Migration output: ${stdout}`);
  });
}

module.exports = { runMigrations };