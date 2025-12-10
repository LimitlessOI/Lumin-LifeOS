```javascript
const funnelRepository = require('./funnel.repository');

exports.getAllFunnels = async () => {
    return funnelRepository.getAll();
};

exports.createFunnel = async (funnelData) => {
    return funnelRepository.create(funnelData);
};

exports.getFunnelById = async (id) => {
    return funnelRepository.findById(id);
};

exports.updateFunnel = async (id, funnelData) => {
    return funnelRepository.update(id, funnelData);
};

exports.deleteFunnel = async (id) => {
    return funnelRepository.delete(id);
};
```