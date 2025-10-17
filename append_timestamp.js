// append_timestamp.js
const fs = require('fs');
const path = require('path');

const readmePath = path.join(__dirname, 'README.md');
const timestamp = new Date().toISOString();
const entry = `\n\nCI run timestamp: ${timestamp}`;

fs.appendFile(readmePath, entry, (err) => {
    if (err) {
        console.error('Error appending to README.md:', err);
        process.exit(1);
    }
    console.log('Timestamp appended to README.md');
});