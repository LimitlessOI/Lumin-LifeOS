```javascript
const sequelize = require('../config/database');
const Process = require('../models/Process');

async function seedProcesses() {
    await sequelize.sync({ force: true }); // Warning: this will drop the table if it exists
    await Process.bulkCreate([
        { name: 'Process A', status: 'pending' },
        { name: 'Process B', status: 'completed' }
    ]);
    console.log('Processes seeded');
}

seedProcesses().catch(err => {
    console.error('Error seeding processes:', err);
    process.exit(1);
});
```