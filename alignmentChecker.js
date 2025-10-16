const fs = require('fs');

const checkAlignment = (task) => {
  const councilManifest = JSON.parse(fs.readFileSync('councilManifest.json'));
  return councilManifest.tasks.includes(task);
};

module.exports = { checkAlignment };