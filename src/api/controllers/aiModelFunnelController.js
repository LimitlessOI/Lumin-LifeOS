```javascript
const AiModelFunnel = require('../../models/AiModelFunnel');

exports.createAssociation = async (req, res) => {
  try {
    const { ai_model_id, funnel_id, performance_metrics } = req.body;
    const association = await AiModelFunnel.create({ ai_model_id, funnel_id, performance_metrics });
    res.status(201).json(association);
  } catch (error) {
    console.error('Error creating association:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAssociations = async (req, res) => {
  try {
    const associations = await AiModelFunnel.findAll();
    res.status(200).json(associations);
  } catch (error) {
    console.error('Error fetching associations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateAssociation = async (req, res) => {
  try {
    const { id } = req.params;
    const { performance_metrics } = req.body;
    const association = await AiModelFunnel.update(
      { performance_metrics },
      { where: { id } }
    );
    res.status(200).json(association);
  } catch (error) {
    console.error('Error updating association:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteAssociation = async (req, res) => {
  try {
    const { id } = req.params;
    await AiModelFunnel.destroy({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting association:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```