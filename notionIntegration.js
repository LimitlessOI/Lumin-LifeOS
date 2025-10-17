// notionIntegration.js
const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function logCall(callData) {
    // Logic to log call data into Notion Contacts and Tasks
    await notion.pages.create({
        parent: { database_id: process.env.NOTION_CONTACTS_DB_ID },
        properties: { /* Map callData to Notion properties */ }
    });

    await notion.pages.create({
        parent: { database_id: process.env.NOTION_TASKS_DB_ID },
        properties: { /* Map callData to Notion properties */ }
    });
}

module.exports = { logCall };