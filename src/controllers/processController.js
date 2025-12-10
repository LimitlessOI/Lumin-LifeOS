```javascript
const ProcessManager = require('../services/ProcessManager');

exports.createProcess = async (req, res, next) => {
    try {
        const process = await ProcessManager.createProcess(req.body);
        res.status(201).json(process);
    } catch (error) {
        next(error);
    }
};

exports.getProcess = async (req, res, next) => {
    try {
        const process = await ProcessManager.getProcessById(req.params.id);
        if (process) {
            res.json(process);
        } else {
            res.status(404).send('Process not found');
        }
    } catch (error) {
        next(error);
    }
};

exports.updateProcess = async (req, res, next) => {
    try {
        const process = await ProcessManager.updateProcess(req.params.id, req.body);
        res.json(process);
    } catch (error) {
        next(error);
    }
};

exports.deleteProcess = async (req, res, next) => {
    try {
        await ProcessManager.deleteProcess(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
```