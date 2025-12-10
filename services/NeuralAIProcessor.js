const brain = require('brain.js');
const { NeuralNetwork } = brain;

class NeuralAIProcessor {
  constructor() {
    this.network = new NeuralNetwork();
  }

  train(data) {
    this.network.train(data);
  }

  run(input) {
    return this.network.run(input);
  }
}

module.exports = new NeuralAIProcessor();