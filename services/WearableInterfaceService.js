const EventEmitter = require('events');
const SerialPort = require('serialport');

class WearableInterfaceService extends EventEmitter {
  constructor() {
    super();
    this.port = new SerialPort('/dev/tty-usbserial1', {
      baudRate: 9600
    });

    this.port.on('data', this.handleData.bind(this));
  }

  handleData(data) {
    try {
      const parsedData = JSON.parse(data);
      this.emit('data', parsedData);
    } catch (error) {
      console.error('Failed to parse data', error);
    }
  }
}

module.exports = new WearableInterfaceService();