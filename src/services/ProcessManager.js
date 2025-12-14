```javascript
const Process = require('../models/Process');

class ProcessManager {
    static async createProcess(data) {
        return await Process.create(data);
    }

    static async getProcessById(id) {
        return await Process.findByPk(id);
    }

    static async updateProcess(id, data) {
        const process = await Process.findByPk(id);
        if (process) {
            await process.update(data);
            return process;
        }
        throw new Error('Process not found');
    }

    static async deleteProcess(id) {
        const process = await Process.findByPk(id);
        if (process) {
            await process.destroy();
            return true;
        }
        throw new Error('Process not found');
    }
}

module.exports = ProcessManager;
```