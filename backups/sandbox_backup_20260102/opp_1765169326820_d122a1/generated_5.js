/**
 * SYNOPSIS: js — backups/sandbox_backup_20260102/opp_1765169326820_d122a1/generated_5.js.
 */
const http = require('http');
const PORT = process.env.PORT || 3000; // Set a default port or use environment variable as needed
const app = require('./server').default;

app.listen(PORT, () => consoles.log(`Server running on port ${PORT}`));