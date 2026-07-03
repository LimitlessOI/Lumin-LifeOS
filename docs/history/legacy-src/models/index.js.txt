/**
 * SYNOPSIS: js — src/models/index.js.
 */
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = prisma;
```