export class CommandCenter {
  constructor() {
    this._state = { status: 'uninitialized' };
    // console.log('CommandCenter: Constructed.'); // Removed console.log for cleaner production code
  }

  async init() {
    this._state.status = 'initialized';
    // console.log('CommandCenter: Initialized.'); // Removed console.log for cleaner production code
    return { ...this._state };
  }

  async shutdown() {
    this._state.status = 'shutdown';
    // console.log('CommandCenter: Shut down.'); // Removed console.log for cleaner production code
    return { ...this._state };
  }

  getState() {
    return { ...this._state }; // Return a copy to prevent external modification
  }
}