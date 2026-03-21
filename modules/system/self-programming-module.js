/**
 * Self-programming module: registers POST /api/v1/system/self-program with auth and AI safety.
 */
export class SelfProgrammingModule {
  constructor({ requireKey, aiSafetyGate, handleSelfProgramRequest }) {
    if (!handleSelfProgramRequest || typeof handleSelfProgramRequest !== "function") {
      throw new Error("SelfProgrammingModule requires handleSelfProgramRequest");
    }
    this.handleSelfProgramRequest = handleSelfProgramRequest;
    this.requireKey = requireKey || (() => {});
    this.aiSafetyGate = aiSafetyGate || ((req, res, next) => next());
    this.routes = [
      {
        path: "/api/v1/system/self-program",
        method: "POST",
        middleware: [this.requireKey, this.aiSafetyGate],
        handler: this.handle.bind(this),
      },
    ];
  }

  async handle(req, res) {
    await this.handleSelfProgramRequest(req, res);
  }
}
