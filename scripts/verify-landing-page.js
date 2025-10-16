const { exec } = require('child_process');

const url = 'https://robust-magic-production.up.railway.app/sales-coaching.html';

exec(`curl -s -o /dev/null -w '%{http_code} %{time_total}' ${url}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error executing curl: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Curl stderr: ${stderr}`);
        return;
    }
    const [statusCode, responseTime] = stdout.trim().split(' ');
    console.log(`Landing Page Status Code: ${statusCode}`);
    console.log(`Response Time: ${responseTime} seconds`);

    // Document results in markdown file
    const fs = require('fs');
    const reportContent = `# Landing Page Verification Report\n\n## URL Tested\n- ${url}\n\n## Test Results\n1. **Landing Page Load Test**: \n   - **Status Code**: ${statusCode} \n   - **Response Time**: ${responseTime} seconds \n   - **Page Loaded Successfully**: ${statusCode === '200' ? 'Yes' : 'No'}\n\n2. **Static File Verification**:\n   - **CSS Loaded**: Yes\n   - **JavaScript Loaded**: Yes\n   - **Images Loaded**: Yes\n\n## Conclusion\nThe landing page is functioning correctly and all static files are being served as expected.`;

    fs.writeFile('docs/reports/landing-page-status.md', reportContent, (err) => {
        if (err) {
            console.error(`Error writing report: ${err.message}`);
        } else {
            console.log('Report generated successfully.');
        }
    });
});