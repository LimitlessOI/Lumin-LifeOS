```javascript
const tf = require('@tensorflow/tfjs-node');

class AnomalyDetector {
  constructor() {
    this.model = this.buildModel();
  }

  buildModel() {
    const model = tf.sequential();
    model.add(tf.layers.lstm({ units: 50, inputShape: [100, 1], returnSequences: true }));
    model.add(tf.layers.lstm({ units: 50 }));
    model.add(tf.layers.dense({ units: 1 }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return model;
  }

  async train(data) {
    const [trainX, trainY] = this.prepareData(data);
    await this.model.fit(trainX, trainY, { epochs: 10 });
    console.log('Model trained');
  }

  predict(input) {
    const tensorInput = tf.tensor2d(input, [input.length, 1]);
    return this.model.predict(tensorInput).dataSync();
  }

  prepareData(data) {
    // Convert raw data into tensors suitable for training
    const x = tf.tensor3d(data, [data.length, 100, 1]);
    const y = tf.tensor2d(data.map(item => item[0]), [data.length, 1]);
    return [x, y];
  }
}

const anomalyDetector = new AnomalyDetector();
module.exports = anomalyDetector;
```