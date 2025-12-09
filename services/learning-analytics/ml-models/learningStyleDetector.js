const tf = require('@tensorflow/tfjs-node');
const brain = require('brain.js');

class LearningStyleDetector {
    constructor() {
        this.model = new brain.NeuralNetwork();
    }

    train(data) {
        this.model.train(data);
    }

    predict(input) {
        return this.model.run(input);
    }
}

module.exports = LearningStyleDetector;