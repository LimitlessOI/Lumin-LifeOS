```javascript
const tf = require('@tensorflow/tfjs-node');
const { SensorData } = require('../../models/agriculture');

async function processSensorData() {
    const data = await SensorData.findAll({ limit: 100 });
    const inputs = data.map(d => Object.values(d.data));
    const model = createModel();
    model.fit(tf.tensor(inputs), tf.tensor(inputs), { epochs: 10 });
    console.log('Model trained with recent sensor data');
}

function createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [inputs[0].length] }));
    model.add(tf.layers.dense({ units: 1 }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return model;
}

module.exports = { processSensorData };
```