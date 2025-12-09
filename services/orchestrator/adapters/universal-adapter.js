```javascript
class UniversalAdapter {
  constructor(name) {
    this.name = name;
  }

  initialize() {
    throw new Error('This method should be implemented by subclasses');
  }

  executeCommand(command) {
    throw new Error('This method should be implemented by subclasses');
  }
}

module.exports = UniversalAdapter;
```