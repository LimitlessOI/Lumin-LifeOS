```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const Scenario = prisma.scenario;

module.exports = Scenario;
```