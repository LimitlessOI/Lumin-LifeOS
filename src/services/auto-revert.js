const { exec } = require('child_process');

const detectFailure = () => {
    // Logic to detect if the last merge caused a failure
    return false; // Replace with actual detection logic
};

const autoRevert = () => {
    if (detectFailure()) {
        exec('git revert HEAD', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error reverting: ${stderr}`);
                return;
            }
            console.log('Reverted last commit.');
            // Redeploy logic here
        });
    }
};

module.exports = { autoRevert };
